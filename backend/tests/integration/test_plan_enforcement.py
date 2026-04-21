"""
Integration tests for Feature #8: Free-vs-paid plan enforcement.

Test cases:
  - Contact limit: max_contacts=2, adding a 3rd returns 402
  - Member limit: max_members=1, accepting invite with a 2nd user returns 402
  - No plan row → free defaults: under 100 limit, contacts added fine
  - Pro plan: max_contacts=10000, adding 5 contacts all succeed
"""
import uuid

import pytest

from app.models.contact import Contact
from app.models.member import Member, MemberRole
from app.models.plan import Plan
from app.models.user import User
from app.models.workspace import Workspace
from tests.conftest import make_fake_user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_user(db_session, email: str) -> User:
    user = make_fake_user(email=email)
    db_session.add(user)
    await db_session.flush()
    return user


async def _seed_workspace(db_session, owner: User, slug: str) -> Workspace:
    ws = Workspace(id=uuid.uuid4(), name="Test WS", slug=slug, owner_id=owner.id)
    db_session.add(ws)
    await db_session.flush()
    return ws


async def _add_member(db_session, workspace: Workspace, user: User, role: MemberRole = MemberRole.member) -> Member:
    m = Member(workspace_id=workspace.id, user_id=user.id, role=role)
    db_session.add(m)
    await db_session.flush()
    return m


async def _seed_contact(db_session, workspace: Workspace, added_by: User, name: str) -> Contact:
    c = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        added_by_user_id=added_by.id,
        name=name,
    )
    db_session.add(c)
    await db_session.flush()
    return c


# ===========================================================================
# Contact limit tests
# ===========================================================================

class TestContactLimitEnforcement:
    async def test_adding_contact_at_limit_returns_402(self, client):
        """Workspace with max_contacts=2; adding a 3rd contact must return 402."""
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, slug="plan-contact-limit-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)

        # Seed plan with max_contacts=2
        plan = Plan(workspace_id=ws.id, tier="free", max_members=5, max_contacts=2)
        db_session.add(plan)

        # Seed 2 existing contacts (at the limit)
        await _seed_contact(db_session, ws, fake_user, "Contact One")
        await _seed_contact(db_session, ws, fake_user, "Contact Two")
        await db_session.commit()

        # Attempt to add a 3rd contact → 402
        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/contacts",
            json={"name": "Contact Three"},
        )

        assert resp.status_code == 402
        data = resp.json()
        assert data["detail"]["code"] == "plan_limit_exceeded"
        assert data["detail"]["resource"] == "contacts"
        assert data["detail"]["limit"] == 2
        assert data["detail"]["current"] == 2

    async def test_adding_contact_under_limit_returns_201(self, client):
        """Workspace with max_contacts=2; adding the 2nd contact (under limit) must succeed."""
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, slug="plan-contact-under-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)

        # Seed plan with max_contacts=2
        plan = Plan(workspace_id=ws.id, tier="free", max_members=5, max_contacts=2)
        db_session.add(plan)

        # Only 1 existing contact — still under the limit
        await _seed_contact(db_session, ws, fake_user, "Contact One")
        await db_session.commit()

        # Adding a 2nd contact (current=1, limit=2) should be fine
        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/contacts",
            json={"name": "Contact Two"},
        )

        assert resp.status_code == 201


# ===========================================================================
# Member limit tests
# ===========================================================================

class TestMemberLimitEnforcement:
    async def test_accept_invite_at_member_limit_returns_402(self, client):
        """Workspace with max_members=1 (owner already a member); accepting invite → 402."""
        http_client, fake_user, db_session = client

        # Seed a separate owner (fake_user will try to join)
        owner = await _seed_user(db_session, email="plan-owner@example.com")
        ws = await _seed_workspace(db_session, owner, slug="plan-member-limit-ws")

        # Owner is the 1 existing member
        await _add_member(db_session, ws, owner, MemberRole.admin)

        # Seed plan with max_members=1
        plan = Plan(workspace_id=ws.id, tier="free", max_members=1, max_contacts=100)
        db_session.add(plan)
        await db_session.commit()

        # fake_user (authenticated via client fixture) tries to accept invite
        resp = await http_client.post(f"/api/v1/auth/accept-invite/{ws.invite_token}")

        assert resp.status_code == 402
        data = resp.json()
        assert data["detail"]["code"] == "plan_limit_exceeded"
        assert data["detail"]["resource"] == "members"
        assert data["detail"]["limit"] == 1
        assert data["detail"]["current"] == 1

    async def test_accept_invite_under_member_limit_returns_201(self, client):
        """Workspace with max_members=2; owner is 1 member; joining as fake_user is OK."""
        http_client, fake_user, db_session = client

        owner = await _seed_user(db_session, email="plan-owner2@example.com")
        ws = await _seed_workspace(db_session, owner, slug="plan-member-under-ws")

        await _add_member(db_session, ws, owner, MemberRole.admin)

        # Plan allows 2 members
        plan = Plan(workspace_id=ws.id, tier="free", max_members=2, max_contacts=100)
        db_session.add(plan)

        # Add fake_user to the DB (required for the FK when member row is created)
        db_session.add(fake_user)
        await db_session.commit()

        resp = await http_client.post(f"/api/v1/auth/accept-invite/{ws.invite_token}")

        assert resp.status_code == 201


# ===========================================================================
# No plan row → free defaults
# ===========================================================================

class TestNoPlanRowFreeTierDefaults:
    async def test_no_plan_row_allows_contacts_under_default_limit(self, client):
        """Workspace with no plan row uses free defaults (max_contacts=100).
        Adding 4 contacts should all succeed."""
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, slug="plan-no-plan-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)
        # No Plan row added deliberately
        await db_session.commit()

        for i in range(4):
            resp = await http_client.post(
                f"/api/v1/workspaces/{ws.id}/contacts",
                json={"name": f"Contact {i}"},
            )
            assert resp.status_code == 201, f"Expected 201 on contact {i}, got {resp.status_code}"


# ===========================================================================
# Pro plan: high limit
# ===========================================================================

class TestProPlanHighLimit:
    async def test_pro_plan_allows_many_contacts(self, client):
        """Workspace with tier=pro, max_contacts=10000; adding 5 contacts is fine."""
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        ws = await _seed_workspace(db_session, fake_user, slug="plan-pro-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.admin)

        plan = Plan(workspace_id=ws.id, tier="pro", max_members=100, max_contacts=10000)
        db_session.add(plan)
        await db_session.commit()

        for i in range(5):
            resp = await http_client.post(
                f"/api/v1/workspaces/{ws.id}/contacts",
                json={"name": f"Pro Contact {i}"},
            )
            assert resp.status_code == 201, f"Expected 201 on contact {i}, got {resp.status_code}"
