"""
Integration tests for path-discovery endpoint.
GET /api/v1/workspaces/{workspace_id}/paths

Test cases:
  - Direct connection (1 hop) found
  - Two-hop path (A→B→C) found
  - No path returns found=False
  - Same contact 400
  - Non-member 403
  - Longer path is not returned when shorter exists
  - Bidirectional: path from A→C found even if edge is stored as C→A
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
# Seed helpers (same conventions as test_edges.py)
# ---------------------------------------------------------------------------


async def _seed_user(db_session, email: str = "owner@example.com") -> User:
    user = make_fake_user(email=email)
    db_session.add(user)
    await db_session.flush()
    return user


async def _seed_workspace(
    db_session,
    owner: User,
    name: str = "Paths Workspace",
    slug: str | None = None,
) -> Workspace:
    slug = slug or f"paths-ws-{uuid.uuid4().hex[:8]}"
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
    name: str = "Contact",
) -> Contact:
    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        added_by_user_id=added_by.id,
        name=name,
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
) -> Edge:
    edge = Edge(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        source_contact_id=source.id,
        target_contact_id=target.id,
        created_by_user_id=created_by.id,
        label=label,
    )
    db_session.add(edge)
    await db_session.flush()
    return edge


def _url(ws_id, from_id, to_id, max_depth: int | None = None) -> str:
    url = f"/api/v1/workspaces/{ws_id}/paths?from_contact_id={from_id}&to_contact_id={to_id}"
    if max_depth is not None:
        url += f"&max_depth={max_depth}"
    return url


# ===========================================================================
# Tests
# ===========================================================================


class TestDirectConnection:
    """1-hop path: A — edge — B"""

    async def test_direct_connection_found(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        await _seed_edge(db_session, ws, a, b, fake_user, label="Colleagues")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, b.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        assert len(data["paths"]) == 1

        path = data["paths"][0]
        assert len(path) == 2  # 2 nodes for 1 hop
        assert path[0]["contact"]["name"] == "Alice"
        assert path[0]["via_edge"] is None  # first node has no edge
        assert path[1]["contact"]["name"] == "Bob"
        assert path[1]["via_edge"] is not None
        assert path[1]["via_edge"]["label"] == "Colleagues"

    async def test_direct_connection_from_contact_in_response(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        await _seed_edge(db_session, ws, a, b, fake_user)
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, b.id))

        data = resp.json()
        assert data["from_contact"]["id"] == str(a.id)
        assert data["to_contact"]["id"] == str(b.id)


class TestTwoHopPath:
    """2-hop path: A — B — C"""

    async def test_two_hop_path_found(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        c = await _seed_contact(db_session, ws, fake_user, name="Carol")
        await _seed_edge(db_session, ws, a, b, fake_user, label="AB")
        await _seed_edge(db_session, ws, b, c, fake_user, label="BC")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, c.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        assert len(data["paths"]) == 1

        path = data["paths"][0]
        assert len(path) == 3  # A, B, C
        names = [step["contact"]["name"] for step in path]
        assert names == ["Alice", "Bob", "Carol"]

        # First step has no edge, rest do
        assert path[0]["via_edge"] is None
        assert path[1]["via_edge"]["label"] == "AB"
        assert path[2]["via_edge"]["label"] == "BC"


class TestNoPath:
    """Disconnected graph returns found=False"""

    async def test_no_path_returns_found_false(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        # No edge between them
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, b.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is False
        assert data["paths"] == []
        assert data["from_contact"]["id"] == str(a.id)
        assert data["to_contact"]["id"] == str(b.id)

    async def test_no_path_respects_max_depth(self, client):
        """Path exists but is longer than max_depth — should return found=False."""
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        c = await _seed_contact(db_session, ws, fake_user, name="Carol")
        d = await _seed_contact(db_session, ws, fake_user, name="Dave")
        # Chain A→B→C→D  (3 hops)
        await _seed_edge(db_session, ws, a, b, fake_user)
        await _seed_edge(db_session, ws, b, c, fake_user)
        await _seed_edge(db_session, ws, c, d, fake_user)
        await db_session.commit()

        # max_depth=2 should not find A→D
        resp = await http_client.get(_url(ws.id, a.id, d.id, max_depth=2))

        assert resp.status_code == 200
        assert resp.json()["found"] is False


class TestSameContactError:
    """Same from/to contact returns 400"""

    async def test_same_contact_returns_400(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, a.id))

        assert resp.status_code == 400


class TestNonMemberForbidden:
    """Non-member gets 403"""

    async def test_non_member_cannot_query_paths(self, client):
        http_client, fake_user, db_session = client

        # fake_user is the authenticated user but NOT added as member
        other_owner = await _seed_user(db_session, email="paths-nm-owner@example.com")
        ws = await _seed_workspace(db_session, other_owner)
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        a = await _seed_contact(db_session, ws, other_owner, name="Alice")
        b = await _seed_contact(db_session, ws, other_owner, name="Bob")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, b.id))

        assert resp.status_code == 403


class TestShorterPathPreferred:
    """BFS returns the shortest path; a longer parallel path is not returned."""

    async def test_shorter_path_wins(self, client):
        """
        Graph:
            A --(direct)-- C           1-hop path
            A -- B -- C                2-hop path

        Result must contain only the 1-hop path.
        """
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        c = await _seed_contact(db_session, ws, fake_user, name="Carol")
        # Direct A→C
        await _seed_edge(db_session, ws, a, c, fake_user, label="Direct")
        # Longer A→B→C
        await _seed_edge(db_session, ws, a, b, fake_user, label="AB")
        await _seed_edge(db_session, ws, b, c, fake_user, label="BC")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, c.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        # All returned paths must be of length 2 (1 hop = 2 nodes)
        for path in data["paths"]:
            assert len(path) == 2, f"Expected 2-node path but got {len(path)}"

    async def test_multiple_shortest_paths_all_returned(self, client):
        """
        Graph:
            A -- B -- C    (via B)
            A -- D -- C    (via D)

        Both are 2-hop paths; both should appear in the result.
        """
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        c = await _seed_contact(db_session, ws, fake_user, name="Carol")
        d = await _seed_contact(db_session, ws, fake_user, name="Dave")
        await _seed_edge(db_session, ws, a, b, fake_user, label="AB")
        await _seed_edge(db_session, ws, b, c, fake_user, label="BC")
        await _seed_edge(db_session, ws, a, d, fake_user, label="AD")
        await _seed_edge(db_session, ws, d, c, fake_user, label="DC")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, c.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        assert len(data["paths"]) == 2
        for path in data["paths"]:
            assert len(path) == 3  # 3 nodes = 2 hops


class TestBidirectional:
    """Edges are undirected for path finding."""

    async def test_reverse_edge_traversed(self, client):
        """
        Edge stored as C → A but path requested A → C must still be found.
        """
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        c = await _seed_contact(db_session, ws, fake_user, name="Carol")
        # Edge stored as C → A (reverse direction)
        await _seed_edge(db_session, ws, c, a, fake_user, label="CA")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, c.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        assert len(data["paths"]) == 1
        assert len(data["paths"][0]) == 2

    async def test_two_hop_reverse_edges(self, client):
        """
        Edges: B→A and C→B  (both reversed).
        Path from A to C should still be found via A—B—C.
        """
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        c = await _seed_contact(db_session, ws, fake_user, name="Carol")
        await _seed_edge(db_session, ws, b, a, fake_user, label="BA")
        await _seed_edge(db_session, ws, c, b, fake_user, label="CB")
        await db_session.commit()

        resp = await http_client.get(_url(ws.id, a.id, c.id))

        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        path = data["paths"][0]
        assert len(path) == 3


class TestContactNotFound:
    """404 when either contact does not exist in this workspace."""

    async def test_from_contact_not_in_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        b = await _seed_contact(db_session, ws, fake_user, name="Bob")
        await db_session.commit()

        ghost_id = uuid.uuid4()
        resp = await http_client.get(_url(ws.id, ghost_id, b.id))

        assert resp.status_code == 404

    async def test_to_contact_not_in_workspace_returns_404(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user)
        await _add_member(db_session, ws, fake_user)
        a = await _seed_contact(db_session, ws, fake_user, name="Alice")
        await db_session.commit()

        ghost_id = uuid.uuid4()
        resp = await http_client.get(_url(ws.id, a.id, ghost_id))

        assert resp.status_code == 404
