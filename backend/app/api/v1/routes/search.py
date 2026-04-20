import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.member import Member
from app.models.tag import ContactTag, Tag
from app.models.user import User
from app.schemas.contact import ContactRead
from app.schemas.tags import TagRead

router = APIRouter(prefix="/workspaces/{workspace_id}/search", tags=["search"])


async def _require_member(workspace_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


@router.get("", response_model=list[ContactRead])
async def search_contacts(
    workspace_id: uuid.UUID,
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    pattern = f"%{q}%"

    # Contact IDs matching on core fields
    field_match_stmt = (
        select(Contact.id)
        .where(
            Contact.workspace_id == workspace_id,
            (
                Contact.name.ilike(pattern)
                | Contact.company.ilike(pattern)
                | Contact.job_title.ilike(pattern)
                | Contact.email.ilike(pattern)
            ),
        )
    )

    # Contact IDs matching via a tag name in this workspace
    tag_match_stmt = (
        select(ContactTag.contact_id)
        .join(Tag, Tag.id == ContactTag.tag_id)
        .where(
            Tag.workspace_id == workspace_id,
            Tag.name.ilike(pattern),
        )
    )

    # Union both sets of contact IDs, then fetch Contact rows
    combined_ids_subq = union(field_match_stmt, tag_match_stmt).subquery()

    contacts_result = await db.execute(
        select(Contact)
        .where(Contact.id.in_(select(combined_ids_subq)))
        .order_by(Contact.name)
        .limit(50)
    )
    contacts = contacts_result.scalars().all()

    if not contacts:
        return []

    # Attach tags in a single query (no N+1)
    contact_ids = [c.id for c in contacts]
    tag_rows = await db.execute(
        select(ContactTag, Tag)
        .join(Tag, Tag.id == ContactTag.tag_id)
        .where(ContactTag.contact_id.in_(contact_ids))
    )
    tags_by_contact: dict[uuid.UUID, list[TagRead]] = defaultdict(list)
    for ct, tag in tag_rows.all():
        tags_by_contact[ct.contact_id].append(TagRead.model_validate(tag))

    return [
        ContactRead(**c.__dict__, tags=tags_by_contact.get(c.id, []))
        for c in contacts
    ]
