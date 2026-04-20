import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.member import Member
from app.models.tag import ContactTag, Tag
from app.models.user import User
from app.schemas.tags import TagCreate, TagRead

router = APIRouter(prefix="/workspaces/{workspace_id}/tags", tags=["tags"])


async def _require_member(workspace_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


@router.post("", response_model=TagRead, status_code=201)
async def create_tag(
    workspace_id: uuid.UUID,
    payload: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    tag = Tag(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        name=payload.name,
        color=payload.color,
    )
    db.add(tag)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Tag with this name already exists in the workspace")
    await db.refresh(tag)
    return tag


@router.get("", response_model=list[TagRead])
async def list_tags(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Tag)
        .where(Tag.workspace_id == workspace_id)
        .order_by(Tag.name)
    )
    return result.scalars().all()


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    workspace_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.workspace_id == workspace_id)
    )
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    await db.commit()


@router.post("/contacts/{contact_id}/tags/{tag_id}", status_code=201)
async def attach_tag_to_contact(
    workspace_id: uuid.UUID,
    contact_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    # Ensure contact belongs to this workspace
    contact_result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.workspace_id == workspace_id)
    )
    if contact_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Contact not found in this workspace")

    # Ensure tag belongs to this workspace
    tag_result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.workspace_id == workspace_id)
    )
    if tag_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Tag not found in this workspace")

    contact_tag = ContactTag(contact_id=contact_id, tag_id=tag_id)
    db.add(contact_tag)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Tag is already attached to this contact")

    return {"contact_id": contact_id, "tag_id": tag_id}


@router.delete("/contacts/{contact_id}/tags/{tag_id}", status_code=204)
async def detach_tag_from_contact(
    workspace_id: uuid.UUID,
    contact_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(ContactTag).where(
            ContactTag.contact_id == contact_id,
            ContactTag.tag_id == tag_id,
        )
    )
    contact_tag = result.scalar_one_or_none()
    if contact_tag is None:
        raise HTTPException(status_code=404, detail="Tag is not attached to this contact")

    await db.delete(contact_tag)
    await db.commit()
