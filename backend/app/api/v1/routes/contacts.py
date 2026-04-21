import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.member import Member
from app.models.tag import ContactTag, Tag
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactRead, ContactUpdate
from app.schemas.tags import TagRead
from app.services.plan_service import check_contact_limit

router = APIRouter(prefix="/workspaces/{workspace_id}/contacts", tags=["contacts"])


async def _fetch_tags_by_contact(
    contact_ids: list[uuid.UUID], db: AsyncSession
) -> dict[uuid.UUID, list[TagRead]]:
    """Return a mapping of contact_id -> list[TagRead] for the given contact IDs."""
    if not contact_ids:
        return {}
    tag_rows = await db.execute(
        select(ContactTag, Tag)
        .join(Tag, Tag.id == ContactTag.tag_id)
        .where(ContactTag.contact_id.in_(contact_ids))
    )
    tags_by_contact: dict[uuid.UUID, list[TagRead]] = defaultdict(list)
    for ct, tag in tag_rows.all():
        tags_by_contact[ct.contact_id].append(TagRead.model_validate(tag))
    return tags_by_contact


async def _require_member(workspace_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


@router.post("", response_model=ContactRead, status_code=201)
async def create_contact(
    workspace_id: uuid.UUID,
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)
    await check_contact_limit(workspace_id, db)

    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        added_by_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return ContactRead(**contact.__dict__, tags=[])


@router.get("", response_model=list[ContactRead])
async def list_contacts(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact)
        .where(Contact.workspace_id == workspace_id)
        .order_by(Contact.name)
    )
    contacts = result.scalars().all()
    tags_by_contact = await _fetch_tags_by_contact([c.id for c in contacts], db)
    return [
        ContactRead(**c.__dict__, tags=tags_by_contact.get(c.id, []))
        for c in contacts
    ]


@router.get("/{cid}", response_model=ContactRead)
async def get_contact(
    workspace_id: uuid.UUID,
    cid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact).where(Contact.id == cid, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    tags_by_contact = await _fetch_tags_by_contact([contact.id], db)
    return ContactRead(**contact.__dict__, tags=tags_by_contact.get(contact.id, []))


@router.patch("/{cid}", response_model=ContactRead)
async def update_contact(
    workspace_id: uuid.UUID,
    cid: uuid.UUID,
    payload: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact).where(Contact.id == cid, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    tags_by_contact = await _fetch_tags_by_contact([contact.id], db)
    return ContactRead(**contact.__dict__, tags=tags_by_contact.get(contact.id, []))


@router.delete("/{cid}", status_code=204)
async def delete_contact(
    workspace_id: uuid.UUID,
    cid: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Contact).where(Contact.id == cid, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
