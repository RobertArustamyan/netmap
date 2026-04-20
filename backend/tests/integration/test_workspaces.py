"""
Integration tests for Feature #2: Workspace management.
Covers:
  - POST   /api/v1/workspaces           — create workspace
  - GET    /api/v1/workspaces           — list workspaces (member-filtered)
  - GET    /api/v1/workspaces/{id}      — get single workspace
  - GET    /api/v1/workspaces/{id}/members — list members
  - PATCH  /api/v1/workspaces/{id}      — rename workspace
  - DELETE /api/v1/workspaces/{id}      — delete workspace
  - PATCH  /api/v1/workspaces/{id}/members/{user_id} — change role
  - DELETE /api/v1/workspaces/{id}/members/{user_id} — remove member
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
# Helpers
# ---------------------------------------------------------------------------

async def _seed_workspace(db_session, owner: User, name: str = "Acme Inc", slug: str = "acme-inc") -> Workspace:
    ws = Workspace(id=uuid.uuid4(), name=name, slug=slug, owner_id=owner.id)
    db_session.add(ws)
    await db_session.flush()
    return ws


async def _add_member(db_session, workspace: Workspace, user: User, role: MemberRole) -> Member:
    m = Member(workspace_id=workspace.id, user_id=user.id, role=role)
    db_session.add(m)
    await db_session.flush()
    return m


def _make_second_client(db_session, second_user: User):
    """Return a context-manager that yields an AsyncClient authenticated as *second_user*."""
    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return second_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ===========================================================================
# POST /api/v1/workspaces
# ===========================================================================

class TestCreateWorkspace:
    async def test_creates_workspace_and_admin_member(self, client):
        http_client, fake_user, db_session = client

        # The fake_user needs to be in the DB for the FK on members table
        db_session.add(fake_user)
        await db_session.commit()

        resp = await http_client.post("/api/v1/workspaces", json={"name": "My Team"})

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Team"
        assert data["slug"] == "my-team"
        assert "invite_url" in data

        ws_id = data["id"]
        result = await db_session.execute(
            select(Member).where(
                Member.workspace_id == uuid.UUID(ws_id),
                Member.user_id == fake_user.id,
            )
        )
        member = result.scalar_one_or_none()
        assert member is not None
        assert member.role == MemberRole.admin

    async def test_duplicate_name_gets_unique_slug(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.commit()

        r1 = await http_client.post("/api/v1/workspaces", json={"name": "Acme"})
        assert r1.status_code == 201
        assert r1.json()["slug"] == "acme"

        r2 = await http_client.post("/api/v1/workspaces", json={"name": "Acme"})
        assert r2.status_code == 201
        assert r2.json()["slug"] == "acme-1"

    async def test_empty_name_returns_422(self, client):
        http_client, fake_user, db_session = client

        resp = await http_client.post("/api/v1/workspaces", json={"name": "  "})
        assert resp.status_code == 422


# ===========================================================================
# GET /api/v1/workspaces
# ===========================================================================

class TestListWorkspaces:
    async def test_returns_only_user_member_workspaces(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        # Workspace the user belongs to
        ws_member = await _seed_workspace(db_session, fake_user, name="Member WS", slug="member-ws")
        await _add_member(db_session, ws_member, fake_user, MemberRole.member)

        # Workspace the user does NOT belong to
        other_user = make_fake_user(email="other@example.com")
        db_session.add(other_user)
        await db_session.flush()
        ws_other = await _seed_workspace(db_session, other_user, name="Other WS", slug="other-ws")
        await _add_member(db_session, ws_other, other_user, MemberRole.admin)

        await db_session.commit()

        resp = await http_client.get("/api/v1/workspaces")

        assert resp.status_code == 200
        data = resp.json()
        ids = [d["id"] for d in data]
        assert str(ws_member.id) in ids
        assert str(ws_other.id) not in ids


# ===========================================================================
# GET /api/v1/workspaces/{id}
# ===========================================================================

class TestGetWorkspace:
    async def test_member_can_get_workspace(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, name="My WS", slug="my-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}")

        assert resp.status_code == 200
        assert resp.json()["id"] == str(ws.id)

    async def test_non_member_gets_403(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        db_session.add(owner)
        await db_session.flush()
        ws = await _seed_workspace(db_session, owner, name="Private WS", slug="private-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}")

        assert resp.status_code == 403


# ===========================================================================
# GET /api/v1/workspaces/{id}/members
# ===========================================================================

class TestListMembers:
    async def test_returns_members_with_email(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        other = make_fake_user(email="colleague@example.com")
        db_session.add(other)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, name="Team WS", slug="team-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await _add_member(db_session, ws, other, MemberRole.member)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/members")

        assert resp.status_code == 200
        data = resp.json()
        emails = {m["email"] for m in data}
        assert fake_user.email in emails
        assert "colleague@example.com" in emails

    async def test_non_member_gets_403(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        db_session.add(owner)
        await db_session.flush()
        ws = await _seed_workspace(db_session, owner, name="Secret", slug="secret")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/members")

        assert resp.status_code == 403


# ===========================================================================
# PATCH /api/v1/workspaces/{id}
# ===========================================================================

class TestUpdateWorkspace:
    async def test_admin_can_rename(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, name="Old Name", slug="old-name")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.patch(f"/api/v1/workspaces/{ws.id}", json={"name": "New Name"})

        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"
        assert resp.json()["slug"] == "new-name"

    async def test_non_member_gets_403(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        db_session.add(owner)
        await db_session.flush()
        ws = await _seed_workspace(db_session, owner, name="Their WS", slug="their-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.patch(f"/api/v1/workspaces/{ws.id}", json={"name": "Hijacked"})

        assert resp.status_code == 403


# ===========================================================================
# DELETE /api/v1/workspaces/{id}
# ===========================================================================

class TestDeleteWorkspace:
    async def test_owner_can_delete(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, name="Delete Me", slug="delete-me")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}")

        assert resp.status_code == 204

        # Confirm gone from DB
        result = await db_session.execute(
            select(Workspace).where(Workspace.id == ws.id)
        )
        assert result.scalar_one_or_none() is None

    async def test_non_owner_gets_403(self, client):
        """fake_user is an admin member but NOT the owner — must get 403."""
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="real-owner@example.com")
        db_session.add(owner)
        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, owner, name="Owner WS", slug="owner-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}")

        assert resp.status_code == 403


# ===========================================================================
# PATCH /api/v1/workspaces/{id}/members/{user_id}
# ===========================================================================

class TestUpdateMemberRole:
    async def test_admin_can_change_role(self, client):
        http_client, fake_user, db_session = client

        target = make_fake_user(email="target@example.com")
        db_session.add(fake_user)
        db_session.add(target)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, name="Role WS", slug="role-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await _add_member(db_session, ws, target, MemberRole.member)
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/members/{target.id}",
            json={"role": "admin"},
        )

        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"

    async def test_cannot_change_owner_role(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        db_session.add(owner)
        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, owner, name="Owner Role WS", slug="owner-role-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()

        # fake_user (admin) tries to change owner's role
        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/members/{owner.id}",
            json={"role": "member"},
        )

        assert resp.status_code == 400
        assert "owner" in resp.json()["detail"].lower()

    async def test_non_admin_gets_403(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        target = make_fake_user(email="target@example.com")
        db_session.add(owner)
        db_session.add(fake_user)
        db_session.add(target)
        await db_session.flush()

        ws = await _seed_workspace(db_session, owner, name="Admin Only WS", slug="admin-only-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await _add_member(db_session, ws, target, MemberRole.member)
        # fake_user is a plain member
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/members/{target.id}",
            json={"role": "admin"},
        )

        assert resp.status_code == 403


# ===========================================================================
# DELETE /api/v1/workspaces/{id}/members/{user_id}
# ===========================================================================

class TestRemoveMember:
    async def test_admin_can_remove_member(self, client):
        http_client, fake_user, db_session = client

        target = make_fake_user(email="removable@example.com")
        db_session.add(fake_user)
        db_session.add(target)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, name="Remove WS", slug="remove-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await _add_member(db_session, ws, target, MemberRole.member)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/members/{target.id}")

        assert resp.status_code == 204

        result = await db_session.execute(
            select(Member).where(
                Member.workspace_id == ws.id,
                Member.user_id == target.id,
            )
        )
        assert result.scalar_one_or_none() is None

    async def test_cannot_remove_owner(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        db_session.add(owner)
        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, owner, name="Keep Owner WS", slug="keep-owner-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/members/{owner.id}")

        assert resp.status_code == 400
        assert "owner" in resp.json()["detail"].lower()

    async def test_non_admin_gets_403(self, client):
        http_client, fake_user, db_session = client

        owner = make_fake_user(email="owner@example.com")
        target = make_fake_user(email="target@example.com")
        db_session.add(owner)
        db_session.add(fake_user)
        db_session.add(target)
        await db_session.flush()

        ws = await _seed_workspace(db_session, owner, name="Plain Member WS", slug="plain-member-ws")
        await _add_member(db_session, ws, owner, MemberRole.admin)
        await _add_member(db_session, ws, target, MemberRole.member)
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/members/{target.id}")

        assert resp.status_code == 403
