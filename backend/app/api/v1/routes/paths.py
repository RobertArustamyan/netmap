"""
GET /api/v1/workspaces/{workspace_id}/paths

Second-degree path discovery: given two contacts, find the shortest
path(s) between them through the shared relationship graph (BFS,
in-memory, bidirectional edges).
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.edge import Edge
from app.models.member import Member
from app.models.user import User
from app.schemas.contact import ContactRead
from app.schemas.edge import EdgeRead
from app.services.graph_service import bfs_all_shortest_paths

router = APIRouter(prefix="/workspaces/{workspace_id}/paths", tags=["paths"])

MAX_ALLOWED_DEPTH = 6


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class PathStep(BaseModel):
    contact: ContactRead
    via_edge: EdgeRead | None  # None for the first node in the path


class PathResult(BaseModel):
    found: bool
    paths: list[list[PathStep]]
    from_contact: ContactRead
    to_contact: ContactRead


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------


async def _require_member(
    workspace_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.get("", response_model=PathResult)
async def find_paths(
    workspace_id: uuid.UUID,
    from_contact_id: uuid.UUID = Query(...),
    to_contact_id: uuid.UUID = Query(...),
    max_depth: int = Query(default=4, ge=1, le=MAX_ALLOWED_DEPTH),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user.id, db)

    # --- 400 if same contact requested ---
    if from_contact_id == to_contact_id:
        raise HTTPException(
            status_code=400,
            detail="from_contact_id and to_contact_id must be different",
        )

    # --- Load all contacts in workspace (one query) ---
    contacts_result = await db.execute(
        select(Contact).where(Contact.workspace_id == workspace_id)
    )
    all_contacts: list[Contact] = list(contacts_result.scalars().all())
    contacts: dict[uuid.UUID, Contact] = {c.id: c for c in all_contacts}

    # --- Validate from/to contacts exist in workspace ---
    if from_contact_id not in contacts:
        raise HTTPException(
            status_code=404,
            detail=f"Contact {from_contact_id} not found in this workspace",
        )
    if to_contact_id not in contacts:
        raise HTTPException(
            status_code=404,
            detail=f"Contact {to_contact_id} not found in this workspace",
        )

    # --- Load all edges in workspace (one query) ---
    edges_result = await db.execute(
        select(Edge).where(Edge.workspace_id == workspace_id)
    )
    all_edges: list[Edge] = list(edges_result.scalars().all())
    edges: dict[uuid.UUID, Edge] = {e.id: e for e in all_edges}

    # --- Build bidirectional adjacency list ---
    adj: dict[uuid.UUID, list[tuple[uuid.UUID, uuid.UUID]]] = {}
    for edge in all_edges:
        src = edge.source_contact_id
        tgt = edge.target_contact_id
        adj.setdefault(src, []).append((tgt, edge.id))
        adj.setdefault(tgt, []).append((src, edge.id))

    # --- BFS ---
    raw_paths = bfs_all_shortest_paths(adj, from_contact_id, to_contact_id, max_depth)

    # --- Build response ---
    from_contact_read = ContactRead.model_validate(contacts[from_contact_id])
    to_contact_read = ContactRead.model_validate(contacts[to_contact_id])

    if not raw_paths:
        return PathResult(
            found=False,
            paths=[],
            from_contact=from_contact_read,
            to_contact=to_contact_read,
        )

    paths: list[list[PathStep]] = []
    for raw_path in raw_paths:
        steps: list[PathStep] = []
        for contact_id, edge_id in raw_path:
            steps.append(
                PathStep(
                    contact=ContactRead.model_validate(contacts[contact_id]),
                    via_edge=EdgeRead.model_validate(edges[edge_id])
                    if edge_id is not None
                    else None,
                )
            )
        paths.append(steps)

    return PathResult(
        found=True,
        paths=paths,
        from_contact=from_contact_read,
        to_contact=to_contact_read,
    )
