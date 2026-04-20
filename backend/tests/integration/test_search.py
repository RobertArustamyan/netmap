"""
Integration tests for the search endpoint.
Covers:
  - GET /api/v1/workspaces/{workspace_id}/search?q=<string>
    — member-only, searches contacts by name / company / job_title / email
    — also matches contacts that have a matching tag name
    — returns list[ContactRead] with tags, ordered by name, max 50
"""
import uuid

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


async def _attach_tag(db_session, contact: Contact, tag: Tag) -> ContactTag:
    ct = ContactTag(contact_id=contact.id, tag_id=tag.id)
    db_session.add(ct)
    await db_session.flush()
    return ct


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/search  — basic field matching
# ===========================================================================

class TestSearchBasic:
    async def test_matches_by_name(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-name-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws, fake_user, name="Alice Johnson")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=alice")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Alice Johnson" in names

    async def test_matches_by_company(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-company-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws, fake_user, name="Bob Smith", company="Acme Corp")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=acme")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Bob Smith" in names

    async def test_matches_by_job_title(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-title-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_contact(
            db_session, ws, fake_user, name="Carol Ng", job_title="Software Engineer"
        )
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=software")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Carol Ng" in names

    async def test_matches_by_email(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-email-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_contact(
            db_session, ws, fake_user, name="Bob Doe", email="bob@example.com"
        )
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=bob@")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Bob Doe" in names

    async def test_case_insensitive(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-case-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws, fake_user, name="Alice Wonderland")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=ALICE")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Alice Wonderland" in names

    async def test_no_match_returns_empty_list(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-empty-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws, fake_user, name="Alice Smith")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=zzznomatch")

        assert resp.status_code == 200
        assert resp.json() == []

    async def test_results_ordered_by_name(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-order-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        # Insert out of alphabetical order; q="a" matches all three names
        await _seed_contact(db_session, ws, fake_user, name="Zara Prince")
        await _seed_contact(db_session, ws, fake_user, name="Alice Martin")
        await _seed_contact(db_session, ws, fake_user, name="Mark Atlas")
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=a")

        assert resp.status_code == 200
        data = resp.json()
        names = [c["name"] for c in data]
        assert set(names) == {"Zara Prince", "Alice Martin", "Mark Atlas"}
        assert names == sorted(names)

    async def test_results_limited_to_workspace(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()

        # ws1 — fake_user is a member; seed a contact here
        ws1 = await _seed_workspace(db_session, fake_user, slug="srch-ws1")
        await _add_member(db_session, ws1, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws1, fake_user, name="Alice InWs1")

        # ws2 — a different owner; fake_user is also a member but we search ws1
        other_owner = await _seed_user(db_session, email="srch-ws2-owner@example.com")
        ws2 = await _seed_workspace(db_session, other_owner, slug="srch-ws2")
        await _add_member(db_session, ws2, fake_user, MemberRole.member)
        await _seed_contact(db_session, ws2, other_owner, name="Alice InWs2")

        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws1.id}/search?q=alice")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Alice InWs1" in names
        assert "Alice InWs2" not in names


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/search  — tag-name matching
# ===========================================================================

class TestSearchByTag:
    async def test_matches_by_tag_name(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-tag-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        contact = await _seed_contact(db_session, ws, fake_user, name="Bob Taggart")
        tag = await _seed_tag(db_session, ws, name="investor")
        await _attach_tag(db_session, contact, tag)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=invest")

        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Bob Taggart" in names

    async def test_tag_match_deduplicates(self, client):
        """Contact whose name AND a tag both contain the query term appears only once."""
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-dedup-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        # Name contains "invest" AND has tag "investor"
        contact = await _seed_contact(db_session, ws, fake_user, name="Invest Manager")
        tag = await _seed_tag(db_session, ws, name="investor")
        await _attach_tag(db_session, contact, tag)
        await db_session.commit()

        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=invest")

        assert resp.status_code == 200
        data = resp.json()
        ids = [c["id"] for c in data]
        # No duplicate entries for the same contact
        assert len(ids) == len(set(ids))
        assert str(contact.id) in ids


# ===========================================================================
# GET /api/v1/workspaces/{workspace_id}/search  — auth & validation
# ===========================================================================

class TestSearchAuth:
    async def test_non_member_gets_403(self, client):
        http_client, fake_user, db_session = client

        other_owner = await _seed_user(db_session, email="srch-nm-owner@example.com")
        ws = await _seed_workspace(db_session, other_owner, slug="srch-nm-ws")
        await _add_member(db_session, ws, other_owner, MemberRole.admin)
        await db_session.commit()

        # fake_user is NOT a member of ws
        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search?q=alice")

        assert resp.status_code == 403

    async def test_missing_q_param_returns_422(self, client):
        http_client, fake_user, db_session = client

        db_session.add(fake_user)
        await db_session.flush()
        ws = await _seed_workspace(db_session, fake_user, slug="srch-noq-ws")
        await _add_member(db_session, ws, fake_user, MemberRole.member)
        await db_session.commit()

        # No ?q= query parameter at all
        resp = await http_client.get(f"/api/v1/workspaces/{ws.id}/search")

        assert resp.status_code == 422
