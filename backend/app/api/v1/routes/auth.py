import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.models.member import Member, MemberRole
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace import InviteInfo, WorkspaceWithInvite
from app.api.v1.routes.workspaces import _create_self_contact
from app.services.plan_service import check_member_limit

router = APIRouter(prefix="/auth", tags=["auth"])


def _invite_url(request: Request, token: str) -> str:
    base = str(request.base_url).rstrip("/")
    # In production the frontend handles /invite/[token], not the backend.
    # Return the frontend URL instead.
    frontend = settings.cors_origins[0]
    return f"{frontend}/invite/{token}"


@router.post(
    "/invite/{workspace_id}",
    response_model=WorkspaceWithInvite,
    summary="Generate (or regenerate) an invite link for a workspace",
)
async def generate_invite(
    workspace_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Only workspace admins (or owner) may generate invite links
    member_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    membership = member_result.scalar_one_or_none()
    if membership is None or membership.role not in (MemberRole.admin, "admin"):
        raise HTTPException(status_code=403, detail="Only workspace admins can generate invite links")

    # Rotate the token
    workspace.invite_token = secrets.token_urlsafe(32)
    await db.commit()
    await db.refresh(workspace)

    return WorkspaceWithInvite(
        **workspace.__dict__,
        invite_url=_invite_url(request, workspace.invite_token),
    )


@router.get(
    "/invite/{token}",
    response_model=InviteInfo,
    summary="Preview workspace info for an invite token (no auth required)",
)
async def preview_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.invite_token == token)
    )
    workspace = result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has expired")

    return InviteInfo(
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        workspace_slug=workspace.slug,
    )


@router.post(
    "/accept-invite/{token}",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Accept an invite and join the workspace",
)
async def accept_invite(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.invite_token == token)
    )
    workspace = result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Invite link is invalid or has expired")

    # Check if already a member
    existing = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace.id,
            Member.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="You are already a member of this workspace")

    # Enforce member limit before adding
    await check_member_limit(workspace.id, db)

    member = Member(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=MemberRole.member,
    )
    db.add(member)
    await db.flush()  # get member.id before creating self-contact

    await _create_self_contact(db, workspace.id, current_user, member)
    await db.commit()

    return {
        "workspace_id": str(workspace.id),
        "workspace_name": workspace.name,
        "profile_complete": False,
    }
