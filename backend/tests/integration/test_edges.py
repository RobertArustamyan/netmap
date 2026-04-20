"""
Integration tests for edges routes.
Covers:
  - POST   /api/v1/workspaces/{workspace_id}/edges        — create edge
  - GET    /api/v1/workspaces/{workspace_id}/edges        — list edges
  - GET    /api/v1/workspaces/{workspace_id}/edges/{id}  — get single edge
  - PATCH  /api/v1/workspaces/{workspace_id}/edges/{id}  — update edge
  - DELETE /api/v1/workspaces/{workspace_id}/edges/{id}  — delete edge (204)
"""
import uuid

import pytest

from app.models.contact import Contact
from app.models.edge import Edge
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


async def _seed_edge(
    db_session,
    workspace: Workspace,
    source: Contact,
    target: Contact,
    created_by: User,
    label: str | None = None,
    notes: str | None = None,
) -> Edge:
    edge = Edge(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        source_contact_id=source.id,
        target_contact_id=target.id,
        created_by_user_id=created_by.id,
        label=label,
        notes=notes,
    )
    db_session.add(edge)
    await db_session.flush()
    return edge


# ===========================================================================
# POST /api/v1/workspaces/{workspace_id}/edges
# ===========================================================================

class TestCreateEdge:
    async def test_create_edge_all_fields(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-create-all-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Source Person")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Target Person")
        await db_session.commit()

        payload = {
            "source_contact_id": str(src.id),
            "target_contact_id": str(tgt.id),
            "label": "Colleague",
            "notes": "Met at a conference",
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 201
        data = resp.json()
        assert data["source_contact_id"] == str(src.id)
        assert data["target_contact_id"] == str(tgt.id)
        assert data["label"] == "Colleague"
        assert data["notes"] == "Met at a conference"
        assert data["workspace_id"] == str(ws.id)
        assert data["created_by_user_id"] == str(fake_user.id)
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_edge_required_fields_only(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-create-min-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Source Min")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Target Min")
        await db_session.commit()

        payload = {
            "source_contact_id": str(src.id),
            "target_contact_id": str(tgt.id),
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 201
        data = resp.json()
        assert data["label"] is None
        assert data["notes"] is None

    async def test_create_edge_self_loop_returns_400(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-self-loop-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Self Loop Person")
        await db_session.commit()

        payload = {
            "source_contact_id": str(src.id),
            "target_contact_id": str(src.id),
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 422

    async def test_create_duplicate_edge_returns_409(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-dup-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Dup Source")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Dup Target")
        await _seed_edge(db_session, ws, src, tgt, fake_user, label="First")
        await db_session.commit()

        payload = {
            "source_contact_id": str(src.id),
            "target_contact_id": str(tgt.id),
            "label": "Second",
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 409

    async def test_create_edge_source_not_in_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-src-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)

        # Contact in a different workspace
        other_owner = await _seed_user(db_session, email="other-edge-src@example.com")
        other_ws = await _seed_workspace(db_session, other_owner, slug="edge-src-other-ws")
        foreign_contact = await _seed_contact(db_session, other_ws, other_owner, name="Foreign")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Our Target")
        await db_session.commit()

        payload = {
            "source_contact_id": str(foreign_contact.id),
            "target_contact_id": str(tgt.id),
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 404

    async def test_create_edge_target_not_in_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-tgt-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)

        other_owner = await _seed_user(db_session, email="other-edge-tgt@example.com")
        other_ws = await _seed_workspace(db_session, other_owner, slug="edge-tgt-other-ws")
        foreign_contact = await _seed_contact(db_session, other_ws, other_owner, name="Foreign")
        src = await _seed_contact(db_session, ws, fake_user, name="Our Source")
        await db_session.commit()

        payload = {
            "source_contact_id": str(src.id),
            "target_contact_id": str(foreign_contact.id),
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 404

    async def test_non_member_cannot_create_edge(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="edge-nm-create@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="edge-nm-create-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        src = await _seed_contact(db_session, ws, other_owner, name="NM Source")
        tgt = await _seed_contact(db_session, ws, other_owner, name="NM Target")
        await db_session.commit()

        payload = {
            "source_contact_id": str(src.id),
            "target_contact_id": str(tgt.id),
        }
        resp = await http_client.post(f"/api/v1/workspaces/{ws.id}/edges", json=payload)

        assert resp.status_code == 403


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/edges
# ===========================================================================

class TestListEdges:
    async def test_list_edges_returns_workspace_edges(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-list-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        c1 = await _seed_contact(db_session, ws, fake_user, name="List C1")
        c2 = await _seed_contact(db_session, ws, fake_user, name="List C2")
        c3 = await _seed_contact(db_session, ws, fake_user, name="List C3")
        await _seed_edge(db_session, ws, c1, c2, fake_user, label="Edge A")
        await _seed_edge(db_session, ws, c2, c3, fake_user, label="Edge B")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/edges")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        labels = {e["label"] for e in data}
        assert labels == {"Edge A", "Edge B"}

    async def test_list_edges_excludes_other_workspace(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws_ours = await _seed_workspace(db_session, fake_user, slug="edge-list-ours-ws")
        await _add_member(db_session, ws_ours, fake_user, MemberRole.member)
        c1 = await _seed_contact(db_session, ws_ours, fake_user, name="Ours C1")
        c2 = await _seed_contact(db_session, ws_ours, fake_user, name="Ours C2")
        await _seed_edge(db_session, ws_ours, c1, c2, fake_user, label="Our Edge")

        other_owner = await _seed_user(db_session, email="edge-list-other@example.com")
        ws_other = await _seed_workspace(db_session, other_owner, slug="edge-list-other-ws")
        oc1 = await _seed_contact(db_session, ws_other, other_owner, name="Other C1")
        oc2 = await _seed_contact(db_session, ws_other, other_owner, name="Other C2")
        await _seed_edge(db_session, ws_other, oc1, oc2, other_owner, label="Other Edge")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws_ours.id}/edges")

        assert resp.status_code == 200
        labels = [e["label"] for e in resp.json()]
        assert "Our Edge" in labels
        assert "Other Edge" not in labels

    async def test_non_member_cannot_list_edges(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="edge-list-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="edge-list-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/edges")

        assert resp.status_code == 403


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/edges/{edge_id}
# ===========================================================================

class TestGetEdge:
    async def test_get_single_edge(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-get-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Get Src")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Get Tgt")
        edge = await _seed_edge(db_session, ws, src, tgt, fake_user, label="Get Edge")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/edges/{edge.id}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(edge.id)
        assert data["label"] == "Get Edge"
        assert data["source_contact_id"] == str(src.id)
        assert data["target_contact_id"] == str(tgt.id)

    async def test_get_edge_not_found_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-get-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/edges/{uuid.uuid4()}")

        assert resp.status_code == 404

    async def test_non_member_cannot_get_edge(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="edge-get-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="edge-get-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        src = await _seed_contact(db_session, ws, other_owner, name="NM Get Src")
        tgt = await _seed_contact(db_session, ws, other_owner, name="NM Get Tgt")
        edge = await _seed_edge(db_session, ws, src, tgt, other_owner, label="NM Edge")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/edges/{edge.id}")

        assert resp.status_code == 403


# ===========================================================================
# PATCH /api/v1/workspaces/{workspace_id}/edges/{edge_id}
# ===========================================================================

class TestUpdateEdge:
    async def test_patch_updates_only_specified_fields(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-patch-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Patch Src")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Patch Tgt")
        edge = await _seed_edge(
            db_session, ws, src, tgt, fake_user, label="Original Label", notes="Original Notes"
        )
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/edges/{edge.id}",
            json={"label": "Updated Label"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["label"] == "Updated Label"
        # notes should remain unchanged
        assert data["notes"] == "Original Notes"

    async def test_patch_notes_only(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-patch-notes-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Notes Src")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Notes Tgt")
        edge = await _seed_edge(
            db_session, ws, src, tgt, fake_user, label="Keep Label", notes="Old Notes"
        )
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/edges/{edge.id}",
            json={"notes": "New Notes"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["notes"] == "New Notes"
        assert data["label"] == "Keep Label"

    async def test_patch_nonexistent_edge_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-patch-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/edges/{uuid.uuid4()}",
            json={"label": "Ghost"},
        )

        assert resp.status_code == 404

    async def test_non_member_cannot_patch_edge(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="edge-patch-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="edge-patch-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        src = await _seed_contact(db_session, ws, other_owner, name="NM Patch Src")
        tgt = await _seed_contact(db_session, ws, other_owner, name="NM Patch Tgt")
        edge = await _seed_edge(db_session, ws, src, tgt, other_owner, label="Protected")
        await db_session.commit()

        resp = await http_client.patch(
            f"/api/v1/workspaces/{ws.id}/edges/{edge.id}",
            json={"label": "Hacked"},
        )

        assert resp.status_code == 403


# ===========================================================================
# DELETE /api/v1/workspaces/{workspace_id}/edges/{edge_id}
# ===========================================================================

class TestDeleteEdge:
    async def test_delete_edge_returns_204_and_gone(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-delete-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        src = await _seed_contact(db_session, ws, fake_user, name="Del Src")
        tgt = await _seed_contact(db_session, ws, fake_user, name="Del Tgt")
        edge = await _seed_edge(db_session, ws, src, tgt, fake_user, label="Delete Me")
        await db_session.commit()

        del_resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/edges/{edge.id}")
        assert del_resp.status_code == 204

        # Subsequent GET must 404
        get_resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/edges/{edge.id}")
        assert get_resp.status_code == 404

    async def test_delete_nonexistent_edge_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="edge-del-404-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/edges/{uuid.uuid4()}")

        assert resp.status_code == 404

    async def test_non_member_cannot_delete_edge(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="edge-del-nm@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="edge-del-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        src = await _seed_contact(db_session, ws, other_owner, name="NM Del Src")
        tgt = await _seed_contact(db_session, ws, other_owner, name="NM Del Tgt")
        edge = await _seed_edge(db_session, ws, src, tgt, other_owner, label="Protected Del")
        await db_session.commit()

        resp = await http_client.delete(f"/api/v1/workspaces/{ws.id}/edges/{edge.id}")

        assert resp.status_code == 403
