"""
Integration tests for Feature #3: Contacts CRUD.
Covers:
  - POST   /api/v1/workspaces/{workspace_id}/contacts        — create contact
  - GET    /api/v1/workspaces/{workspace_id}/contacts        — list contacts
  - GET    /api/v1/workspaces/{workspace_id}/contacts/{cid}  — get single contact
  - PATCH  /api/v1/workspaces/{workspace_id}/contacts/{cid}  — update contact
  - DELETE /api/v1/workspaces/{workspace_id}/contacts/{cid}  — delete contact (204)
"""
import uuid

import pytest

from app.models.contact import Contact
from app.models.member import Member, MemberRole
from app.models.user import User
from app.models.workspace import Workspace
from tests.conftest import make_fake_user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _seed_user(db_session, email: str = "owner@example.com") -> User:
    user = make_fake_user(email=email)
    db_session.add(user)
    await db_session.flush()
    return user


async def _seed_workspace(
    db_session,
    owner: User,
    name: str = "Test Workspace",
    slug: str = "test-workspace",
) -> Workspace:
    ws = Workspace(id=uuid.uuid4(), name=name, slug=slug, owner_id=owner.id)
    db_session.add(ws)
    await db_session.flush()
    return ws


async def _add_member(
    db_session, workspace: Workspace, user: User, role: MemberRole = MemberRole.member
) -> Member:
    m = Member(workspace_id=workspace.id, user_id=user.id, role=role)
    db_session.add(m)
    await db_session.flush()
    return m


async def _seed_contact(
    db_session,
    workspace: Workspace,
    added_by: User,
    name: str = "Alice Smith",
    **kwargs,
) -> Contact:
    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        added_by_user_id=added_by.id,
        name=name,
        **kwargs,
    )
    db_session.add(contact)
    await db_session.flush()
    return contact


# ===========================================================================
# POST /api/v1/workspaces/{workspace_id}/contacts
# ===========================================================================

class TestCreateContact:
    async def test_create_contact_all_fields(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="create-all-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        payload = {
            "name": "Bob Jones",
            "job_title": "Engineer",
            "company": "Acme Corp",
            "linkedin_url": "https://linkedin.com/in/bobjones",
            "email": "bob@acme.com",
            "phone": "+1234567890",
            "notes": "Met at conference",
        }
        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/contacts", json=payload
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Bob Jones"
        assert data["job_title"] == "Engineer"
        assert data["company"] == "Acme Corp"
        assert data["linkedin_url"] == "https://linkedin.com/in/bobjones"
        assert data["email"] == "bob@acme.com"
        assert data["phone"] == "+1234567890"
        assert data["notes"] == "Met at conference"
        assert data["workspace_id"] == str(ws.id)
        assert data["added_by_user_id"] == str(fake_user.id)
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_contact_name_only(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="create-name-only-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/contacts", json={"name": "Minimal Contact"}
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Minimal Contact"
        assert data["job_title"] is None
        assert data["company"] is None
        assert data["linkedin_url"] is None
        assert data["email"] is None
        assert data["phone"] is None
        assert data["notes"] is None

    async def test_non_member_cannot_create_contact(self, client):
        http_client, fake_user, db_session = client

        # Create workspace owned by a different user; fake_user has no membership
        other_owner = await _seed_user(db_session, email="other-owner@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="non-member-create-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/contacts", json={"name": "Sneaky Contact"}
        )

        assert resp.status_code == 403

    async def test_create_contact_empty_name_returns_422(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="empty-name-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/contacts", json={"name": "   "}
        )

        assert resp.status_code == 422


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/contacts
# ===========================================================================

class TestListContacts:
    async def test_list_contacts_ordered_by_name(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="list-order-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)

        # Insert out of alphabetical order
        await _seed_contact(db_session, ws, fake_user, name="Zara Young")
        await _seed_contact(db_session, ws, fake_user, name="Alice Brown")
        await _seed_contact(db_session, ws, fake_user, name="Mark Davis")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/contacts")

        assert resp.status_code == 200
        data = resp.json()
        names = [c["name"] for c in data]
        assert names == sorted(names)
        assert set(names) == {"Zara Young", "Alice Brown", "Mark Davis"}

    async def test_list_contacts_excludes_other_workspace(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        # Our workspace
        ws_ours = await _seed_workspace(db_session, fake_user, slug="list-ours-ws")
        await _add_member(db_session, ws_ours, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws_ours, fake_user, name="Our Contact")

        # Another workspace we don't belong to — contacts should not appear
        other_owner = await _seed_user(db_session, email="list-other@example.com")
        ws_other = await _seed_workspace(
            db_session, other_owner, slug="list-other-ws"
        )
        await _seed_contact(db_session, ws_other, other_owner, name="Other Contact")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws_ours.id}/contacts")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Our Contact" in names
        assert "Other Contact" not in names

    async def test_non_member_cannot_list_contacts(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="lm-other@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="list-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/contacts")

        assert resp.status_code == 403


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/contacts/{cid}
# ===========================================================================

class TestGetContact:
    async def test_get_single_contact(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="get-single-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(
            db_session, ws, fake_user, name="Single Contact", company="BizCo"
        )
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(contact.id)
        assert data["name"] == "Single Contact"
        assert data["company"] == "BizCo"
        assert data["workspace_id"] == str(ws.id)

    async def test_get_contact_not_found_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="get-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.get(
            f"/api/v1/workspaces/{ws.id}/contacts/{uuid.uuid4()}"
        )

        assert resp.status_code == 404

    async def test_non_member_cannot_get_contact(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="getnm-other@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="get-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        contact = await _seed_contact(db_session, ws, other_owner, name="Secret Contact")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}")

        assert resp.status_code == 403


# ===========================================================================
# PATCH /api/v1/workspaces/{workspace_id}/contacts/{cid}
# ===========================================================================

class TestUpdateContact:
    async def test_patch_updates_only_specified_fields(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="patch-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(
            db_session,
            ws,
            fake_user,
            name="Original Name",
            company="Original Corp",
            job_title="Original Title",
        )
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}",
            json={"company": "Updated Corp"},
        )

        assert resp.status_code == 200
        data = resp.json()
        # Updated field changed
        assert data["company"] == "Updated Corp"
        # Untouched fields stayed the same
        assert data["name"] == "Original Name"
        assert data["job_title"] == "Original Title"

    async def test_non_member_cannot_update_contact(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="patchnm-other@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="patch-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        contact = await _seed_contact(db_session, ws, other_owner, name="Protected Contact")
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}",
            json={"name": "Hacked Name"},
        )

        assert resp.status_code == 403


# ===========================================================================
# DELETE /api/v1/workspaces/{workspace_id}/contacts/{cid}
# ===========================================================================

class TestDeleteContact:
    async def test_delete_contact_returns_204_and_contact_gone(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="delete-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Delete Me")
        await db_session.commit()

        del_resp = await http_client.delete(
            f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}"
        )
        assert del_resp.status_code == 204

        # Subsequent GET must 404
        get_resp = await http_client.get(
            f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}"
        )
        assert get_resp.status_code == 404

    async def test_non_member_cannot_delete_contact(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="delnm-other@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="delete-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        contact = await _seed_contact(db_session, ws, other_owner, name="Protected Contact")
        await db_session.commit()

        resp = await http_client.delete(
            f"/api/v1/workspaces/{ws.id}/contacts/{contact.id}"
        )

        assert resp.status_code == 403
