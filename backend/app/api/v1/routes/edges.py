import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.edge import Edge
from app.models.member import Member
from app.models.user import User
from app.schemas.edge import EdgeCreate, EdgeRead, EdgeUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/edges", tags=["edges"])


async def _require_member(workspace_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


async def _get_contact_in_workspace(
    contact_id: uuid.UUID, workspace_id: uuid.UUID, db: AsyncSession
) -> Contact:
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.workspace_id == workspace_id)
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(
            status_code=404,
            detail=f"Contact {contact_id} not found in this workspace",
        )
    return contact


@router.post("", response_model=EdgeRead, status_code=201)
async def create_edge(
    workspace_id: uuid.UUID,
    payload: EdgeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    # Validate both contacts belong to this workspace
    await _get_contact_in_workspace(payload.source_contact_id, workspace_id, db)
    await _get_contact_in_workspace(payload.target_contact_id, workspace_id, db)

    edge = Edge(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        created_by_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(edge)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Edge between these contacts already exists")
    await db.refresh(edge)
    return edge


@router.get("", response_model=list[EdgeRead])
async def list_edges(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Edge)
        .where(Edge.workspace_id == workspace_id)
        .order_by(Edge.created_at)
    )
    return result.scalars().all()


@router.get("/{edge_id}", response_model=EdgeRead)
async def get_edge(
    workspace_id: uuid.UUID,
    edge_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Edge).where(Edge.id == edge_id, Edge.workspace_id == workspace_id)
    )
    edge = result.scalar_one_or_none()
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")
    return edge


@router.patch("/{edge_id}", response_model=EdgeRead)
async def update_edge(
    workspace_id: uuid.UUID,
    edge_id: uuid.UUID,
    payload: EdgeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Edge).where(Edge.id == edge_id, Edge.workspace_id == workspace_id)
    )
    edge = result.scalar_one_or_none()
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(edge, field, value)

    await db.commit()
    await db.refresh(edge)
    return edge


@router.delete("/{edge_id}", status_code=204)
async def delete_edge(
    workspace_id: uuid.UUID,
    edge_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Edge).where(Edge.id == edge_id, Edge.workspace_id == workspace_id)
    )
    edge = result.scalar_one_or_none()
    if edge is None:
        raise HTTPException(status_code=404, detail="Edge not found")

    await db.delete(edge)
    await db.commit()
