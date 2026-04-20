import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.member import Member
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactRead, ContactUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/contacts", tags=["contacts"])


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

    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        added_by_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


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
    return result.scalars().all()


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
    return contact


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
    return contact


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
