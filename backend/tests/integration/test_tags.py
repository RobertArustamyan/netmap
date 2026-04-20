"""
Integration tests for tags routes.
Covers:
  - POST   /api/v1/workspaces/{workspace_id}/tags                              — create tag
  - GET    /api/v1/workspaces/{workspace_id}/tags                              — list tags
  - DELETE /api/v1/workspaces/{workspace_id}/tags/{tag_id}                    — delete tag
  - POST   /api/v1/workspaces/{workspace_id}/tags/contacts/{contact_id}/tags/{tag_id}  — attach tag
  - DELETE /api/v1/workspaces/{workspace_id}/tags/contacts/{contact_id}/tags/{tag_id}  — detach tag
"""
import uuid

import pytest

from app.models.contact import Contact
from app.models.member import Member, MemberRole
from app.models.tag import ContactTag, Tag
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


async def _seed_tag(
    db_session,
    workspace: Workspace,
    name: str = "Engineering",
    color: str | None = None,
) -> Tag:
    tag = Tag(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        name=name,
        color=color,
    )
    db_session.add(tag)
    await db_session.flush()
    return tag


# ===========================================================================
# POST /api/v1/workspaces/{workspace_id}/tags
# ===========================================================================

class TestCreateTag:
    async def test_create_tag_with_color(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-create-color-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        payload = {"name": "Engineering", "color": "#FF5733"}
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/tags", json=payload)

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Engineering"
        assert data["color"] == "#FF5733"
        assert data["workspace_id"] == str(ws.id)
        assert "id" in data

    async def test_create_tag_name_only(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-create-min-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags", json={"name": "Minimal Tag"}
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Minimal Tag"
        assert data["color"] is None

    async def test_create_duplicate_tag_name_returns_409(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-dup-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_tag(db_session, ws, name="Duplicate")
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags", json={"name": "Duplicate"}
        )

        assert resp.status_code == 409

    async def test_same_tag_name_allowed_in_different_workspace(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        ws1 = await _seed_workspace(db_session, fake_user, slug="tag-diff-ws1")
        await _add_member(db_session, ws1, fake_user, MemberRole.member)
        await _seed_tag(db_session, ws1, name="SharedName")

        ws2 = await _seed_workspace(db_session, fake_user, slug="tag-diff-ws2")
        await _add_member(db_session, ws2, fake_user, MemberRole.member)
        await db_session.commit()

        # Same name in ws2 should succeed
        resp = await http_client.post(
            f"/api/v1/workspaces/{ws2.id}/tags", json={"name": "SharedName"}
        )

        assert resp.status_code == 201

    async def test_non_member_cannot_create_tag(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="tag-nm-create@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="tag-nm-create-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags", json={"name": "Sneaky Tag"}
        )

        assert resp.status_code == 403


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/tags
# ===========================================================================

class TestListTags:
    async def test_list_tags_ordered_by_name(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-list-order-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        # Insert out of alphabetical order
        await _seed_tag(db_session, ws, name="Zebra")
        await _seed_tag(db_session, ws, name="Alpha")
        await _seed_tag(db_session, ws, name="Mango")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/tags")

        assert resp.status_code == 200
        data = resp.json()
        names = [t["name"] for t in data]
        assert names == sorted(names)
        assert set(names) == {"Zebra", "Alpha", "Mango"}

    async def test_list_tags_excludes_other_workspace(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws_ours = await _seed_workspace(db_session, fake_user, slug="tag-list-ours-ws")
        await _add_member(db_session, ws_ours, fake_user, MemberRole.member)
        await _seed_tag(db_session, ws_ours, name="OurTag")

        other_owner = await _seed_user(db_session, email="tag-list-other@example.com")
        ws_other = await _seed_workspace(db_session, other_owner, slug="tag-list-other-ws")
        await _seed_tag(db_session, ws_other, name="OtherTag")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws_ours.id}/tags")

        assert resp.status_code == 200
        names = [t["name"] for t in resp.json()]
        assert "OurTag" in names
        assert "OtherTag" not in names

    async def test_non_member_cannot_list_tags(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="tag-list-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="tag-list-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/tags")

        assert resp.status_code == 403


# ===========================================================================
# DELETE /api/v1/workspaces/{workspace_id}/tags/{tag_id}
# ===========================================================================

class TestDeleteTag:
    async def test_delete_tag_returns_204(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-delete-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        tag = await _seed_tag(db_session, ws, name="Delete Me")
        await db_session.commit()

        del_resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/tags/{tag.id}")
        assert del_resp.status_code == 204

        # Tag should no longer appear in list
        list_resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/tags")
        assert list_resp.status_code == 200
        names = [t["name"] for t in list_resp.json()]
        assert "Delete Me" not in names

    async def test_delete_nonexistent_tag_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-del-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/tags/{uuid.uuid4()}")

        assert resp.status_code == 404

    async def test_non_member_cannot_delete_tag(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="tag-del-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="tag-del-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        tag = await _seed_tag(db_session, ws, name="Protected Tag")
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/tags/{tag.id}")

        assert resp.status_code == 403


# ===========================================================================
# POST /api/v1/workspaces/{workspace_id}/tags/contacts/{contact_id}/tags/{tag_id}
# ===========================================================================

class TestAttachTag:
    async def test_attach_tag_to_contact_returns_201(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-attach-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Taggable Person")
        tag = await _seed_tag(db_session, ws, name="VIP")
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 201
        data = resp.json()
        assert data["contact_id"] == str(contact.id)
        assert data["tag_id"] == str(tag.id)

    async def test_attach_same_tag_twice_returns_409(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-attach-dup-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Dup Tag Person")
        tag = await _seed_tag(db_session, ws, name="DupTag")
        # Seed the ContactTag directly so first attach is already done
        ct = ContactTag(contact_id=contact.id, tag_id=tag.id)
        db_session.add(ct)
        await db_session.commit()

        # Try attaching again via HTTP
        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 409

    async def test_attach_tag_contact_not_in_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-attach-c-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        tag = await _seed_tag(db_session, ws, name="OrphanTag")

        other_owner = await _seed_user(db_session, email="tag-attach-c404@example.com")
        other_ws = await _seed_workspace(db_session, other_owner, slug="tag-attach-c-other-ws")
        foreign_contact = await _seed_contact(db_session, other_ws, other_owner, name="Foreign")
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{foreign_contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 404

    async def test_attach_tag_not_in_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-attach-t-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Local Contact")

        other_owner = await _seed_user(db_session, email="tag-attach-t404@example.com")
        other_ws = await _seed_workspace(db_session, other_owner, slug="tag-attach-t-other-ws")
        foreign_tag = await _seed_tag(db_session, other_ws, name="ForeignTag")
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{foreign_tag.id}"
        )

        assert resp.status_code == 404

    async def test_non_member_cannot_attach_tag(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="tag-attach-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="tag-attach-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        contact = await _seed_contact(db_session, ws, other_owner, name="NM Contact")
        tag = await _seed_tag(db_session, ws, name="NMTag")
        await db_session.commit()

        resp = await http_client.post(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 403


# ===========================================================================
# DELETE /api/v1/workspaces/{workspace_id}/tags/contacts/{contact_id}/tags/{tag_id}
# ===========================================================================

class TestDetachTag:
    async def test_detach_tag_returns_204(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-detach-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Detach Person")
        tag = await _seed_tag(db_session, ws, name="Removable")
        ct = ContactTag(contact_id=contact.id, tag_id=tag.id)
        db_session.add(ct)
        await db_session.commit()

        resp = await http_client.delete(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 204

    async def test_detach_tag_not_attached_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="tag-detach-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Detach 404 Person")
        tag = await _seed_tag(db_session, ws, name="NotAttached")
        await db_session.commit()

        resp = await http_client.delete(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 404

    async def test_non_member_cannot_detach_tag(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="tag-detach-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="tag-detach-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        contact = await _seed_contact(db_session, ws, other_owner, name="NM Detach Contact")
        tag = await _seed_tag(db_session, ws, name="NMDetachTag")
        ct = ContactTag(contact_id=contact.id, tag_id=tag.id)
        db_session.add(ct)
        await db_session.commit()

        resp = await http_client.delete(
            f"/api/v1/workspaces/{ws.id}/tags/contacts/{contact.id}/tags/{tag.id}"
        )

        assert resp.status_code == 403
