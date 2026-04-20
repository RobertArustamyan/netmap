"""
Integration tests for Feature #1: Auth + Invite flow.
Covers:
  - GET  /api/v1/auth/invite/{token}   — preview invite (public, no auth)
  - POST /api/v1/auth/accept-invite/{token} — accept invite (creates member)
  - POST /api/v1/auth/invite/{workspace_id} — rotate invite token (admin only)
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.member import Member, MemberRole
from app.models.user import User
from app.models.workspace import Workspace
from tests.conftest import make_fake_user


# ---------------------------------------------------------------------------
# Helpers to seed DB state directly
# ---------------------------------------------------------------------------

async def _create_workspace(db_session, owner: User) -> Workspace:
    """Create a workspace owned by *owner* and return it."""
    ws = Workspace(
        id=uuid.uuid4(),
        name="Test Corp",
        slug="test-corp",
        owner_id=owner.id,
    )
    db_session.add(ws)
    await db_session.flush()
    return ws


async def _add_member(db_session, workspace: Workspace, user: User, role: MemberRole) -> Member:
    m = Member(
        workspace_id=workspace.id,
        user_id=user.id,
        role=role,
    )
    db_session.add(m)
    await db_session.flush()
    return m


async def _seed_owner_and_workspace(db_session):
    """Seed an owner user + workspace + admin membership. Returns (owner, workspace)."""
    owner = make_fake_user(email="owner@example.com")
    db_session.add(owner)
    await db_session.flush()

    ws = await _create_workspace(db_session, owner)
    await _add_member(db_session, ws, owner, MemberRole.admin)
    await db_session.commit()
    await db_session.refresh(ws)
    return owner, ws


# ===========================================================================
# Tests: GET /api/v1/auth/invite/{token}
# ===========================================================================

class TestPreviewInvite:
    async def test_valid_token_returns_workspace_info(self, client):
        http_client, fake_user, db_session = client

        owner, ws = await _seed_owner_and_workspace(db_session)

        resp = await http_client.get(f"/api/v1/auth/invite/{ws.invite_token}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["workspace_id"] == str(ws.id)
        assert data["workspace_name"] == ws.name
        assert data["workspace_slug"] == ws.slug

    async def test_invalid_token_returns_404(self, client):
        http_client, fake_user, db_session = client

        resp = await http_client.get("/api/v1/auth/invite/totally-invalid-token")

        assert resp.status_code == 404
        assert "invalid" in resp.json()["detail"].lower() or "expired" in resp.json()["detail"].lower()


# ===========================================================================
# Tests: POST /api/v1/auth/accept-invite/{token}
# ===========================================================================

class TestAcceptInvite:
    async def test_valid_token_adds_user_as_member(self, client):
        http_client, fake_user, db_session = client

        # Seed a workspace; fake_user is NOT yet a member
        owner, ws = await _seed_owner_and_workspace(db_session)

        resp = await http_client.post(f"/api/v1/auth/accept-invite/{ws.invite_token}")

        assert resp.status_code == 201
        data = resp.json()
        assert data["workspace_id"] == str(ws.id)
        assert data["workspace_name"] == ws.name

        # Verify member row was created in DB
        result = await db_session.execute(
            select(Member).where(
                Member.workspace_id == ws.id,
                Member.user_id == fake_user.id,
            )
        )
        member = result.scalar_one_or_none()
        assert member is not None
        assert member.role == MemberRole.member

    async def test_accept_twice_returns_409(self, client):
        http_client, fake_user, db_session = client

        owner, ws = await _seed_owner_and_workspace(db_session)

        # First accept — should succeed
        r1 = await http_client.post(f"/api/v1/auth/accept-invite/{ws.invite_token}")
        assert r1.status_code == 201

        # Second accept — should conflict
        r2 = await http_client.post(f"/api/v1/auth/accept-invite/{ws.invite_token}")
        assert r2.status_code == 409
        assert "already" in r2.json()["detail"].lower()

    async def test_invalid_token_returns_404(self, client):
        http_client, fake_user, db_session = client

        resp = await http_client.post("/api/v1/auth/accept-invite/no-such-token")

        assert resp.status_code == 404


# ===========================================================================
# Tests: POST /api/v1/auth/invite/{workspace_id}  (rotate token)
# ===========================================================================

class TestGenerateInvite:
    async def test_admin_can_rotate_invite_token(self, client):
        """The fake_user (injected by fixture) is set as admin of the workspace."""
        http_client, fake_user, db_session = client

        # Seed workspace owned by a *different* user but with fake_user as admin
        other_owner = make_fake_user(email="other@example.com")
        db_session.add(other_owner)
        await db_session.flush()

        ws = Workspace(
            id=uuid.uuid4(),
            name="Admin Test Corp",
            slug="admin-test-corp",
            owner_id=other_owner.id,
        )
        db_session.add(ws)
        await db_session.flush()

        # fake_user is already in the db (upserted by get_current_user override) — add them
        db_session.add(fake_user)
        await db_session.flush()

        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()
        await db_session.refresh(ws)

        old_token = ws.invite_token

        resp = await http_client.post(f"/api/v1/auth/invite/{str(ws.id)}")

        assert resp.status_code == 200
        data = resp.json()
        assert "invite_url" in data
        # The token embedded in the URL should differ from the old one
        assert old_token not in data["invite_url"] or data["invite_url"].endswith(old_token) is False

    async def test_non_admin_gets_403(self, client):
        """fake_user is NOT a member; expect 403."""
        http_client, fake_user, db_session = client

        owner, ws = await _seed_owner_and_workspace(db_session)
        # fake_user has no membership at all

        resp = await http_client.post(f"/api/v1/auth/invite/{str(ws.id)}")

        assert resp.status_code == 403

    async def test_nonexistent_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        resp = await http_client.post(f"/api/v1/auth/invite/{uuid.uuid4()}")

        assert resp.status_code == 404
