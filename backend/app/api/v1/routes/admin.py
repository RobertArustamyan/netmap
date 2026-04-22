import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_superadmin
from app.models.user import User
from app.schemas.admin import (
    AdminPlanUpdate,
    AdminStats,
    AdminSubscriptionRead,
    AdminUserRead,
    AdminWorkspaceRead,
)
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[AdminUserRead])
async def list_users(
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserRead]:
    """Return all users with their owned-workspace count."""
    return await admin_service.list_users(db)


@router.delete("/users/{uid}", status_code=204)
async def delete_user(
    uid: uuid.UUID,
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Hard-delete a user. A superadmin cannot delete themselves."""
    if current_user.id == uid:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = await admin_service.get_user(uid, db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    await admin_service.delete_user(uid, db)


# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------


@router.get("/workspaces", response_model=list[AdminWorkspaceRead])
async def list_workspaces(
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminWorkspaceRead]:
    """Return all workspaces with owner email, member/contact counts, and plan tier."""
    try:
        return await admin_service.list_workspaces(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/workspaces/{wid}/plan", response_model=AdminWorkspaceRead)
async def update_workspace_plan(
    wid: uuid.UUID,
    payload: AdminPlanUpdate,
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> AdminWorkspaceRead:
    """Update (or create) the plan for a workspace."""
    workspace = await admin_service.get_workspace(wid, db)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    await admin_service.update_workspace_plan(
        workspace_id=wid,
        tier=payload.tier,
        max_members=payload.max_members,
        max_contacts=payload.max_contacts,
        db=db,
    )

    # Re-fetch the workspace row so we can return a fully-populated AdminWorkspaceRead.
    workspaces = await admin_service.list_workspaces(db)
    for ws in workspaces:
        if ws.id == wid:
            return ws

    # Should never reach here after a successful upsert, but guard anyway.
    raise HTTPException(status_code=500, detail="Failed to retrieve updated workspace")


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------


@router.get("/subscriptions", response_model=list[AdminSubscriptionRead])
async def list_subscriptions(
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminSubscriptionRead]:
    """
    Return all plan rows that have a Stripe subscription ID.
    Returns an empty list until Stripe integration is implemented.
    """
    return await admin_service.list_subscriptions(db)


# ---------------------------------------------------------------------------
# Analytics / Stats
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStats)
async def get_platform_stats(
    current_user: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
) -> AdminStats:
    """Return aggregated platform-wide stats for the admin analytics page."""
    try:
        return await admin_service.get_platform_stats(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
