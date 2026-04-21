import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.member import Member, MemberRole
from app.models.plan import Plan
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.contact import ContactRead, ContactUpdate, MemberProfileRead
from app.schemas.workspace import MemberRead, MemberRoleUpdate, WorkspaceCreate, WorkspaceRead, WorkspaceUpdate, WorkspaceWithInvite

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


async def _create_self_contact(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user: User,
    member: Member,
) -> None:
    """Create a self-contact node for a member and link it to the member row."""
    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        added_by_user_id=user.id,
        name=user.display_name or user.email,
        email=user.email,
        is_self=True,
    )
    db.add(contact)
    await db.flush()
    member.self_contact_id = contact.id


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = slug.strip("-")
    return slug


def _invite_url(request: Request, token: str, settings_cors: list[str]) -> str:
    frontend = settings_cors[0]
    return f"{frontend}/invite/{token}"


@router.post("", response_model=WorkspaceWithInvite, status_code=201)
async def create_workspace(
    payload: WorkspaceCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.config import settings

    base_slug = _slugify(payload.name)
    slug = base_slug
    # Ensure slug uniqueness
    counter = 1
    while True:
        existing = await db.execute(select(Workspace).where(Workspace.slug == slug))
        if existing.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    workspace = Workspace(
        id=uuid.uuid4(),
        name=payload.name,
        slug=slug,
        owner_id=current_user.id,
    )
    db.add(workspace)
    await db.flush()  # get workspace.id before adding member

    # Creator is automatically an admin member
    member = Member(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=MemberRole.admin,
    )
    db.add(member)
    await db.flush()  # get member.id before creating self-contact

    await _create_self_contact(db, workspace.id, current_user, member)

    # Auto-create a free-tier plan for every new workspace
    plan = Plan(workspace_id=workspace.id)
    db.add(plan)

    await db.commit()
    await db.refresh(workspace)

    return WorkspaceWithInvite(
        **workspace.__dict__,
        invite_url=_invite_url(request, workspace.invite_token, settings.cors_origins),
    )


@router.get("", response_model=list[WorkspaceRead])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace)
        .join(Member, Member.workspace_id == Workspace.id)
        .where(Member.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{workspace_id}", response_model=WorkspaceRead)
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ensure caller is a member
    member_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    if member_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.get("/{workspace_id}/members", response_model=list[MemberRead])
async def list_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Caller must be a member
    caller_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    if caller_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    result = await db.execute(
        select(Member, User)
        .join(User, User.id == Member.user_id)
        .where(Member.workspace_id == workspace_id)
    )
    rows = result.all()
    return [
        MemberRead(
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            email=user.email,
            display_name=user.display_name,
        )
        for member, user in rows
    ]


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a workspace. Caller must be an admin member or the workspace owner."""
    # Load workspace
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check caller is admin or owner
    caller_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    caller_member = caller_result.scalar_one_or_none()
    is_owner = workspace.owner_id == current_user.id
    is_admin = caller_member is not None and caller_member.role == MemberRole.admin
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Admin or owner access required")

    # Re-slugify and ensure uniqueness (skip current workspace)
    base_slug = _slugify(payload.name)
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(
            select(Workspace).where(Workspace.slug == slug, Workspace.id != workspace_id)
        )
        if existing.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    workspace.name = payload.name
    workspace.slug = slug
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workspace. Caller must be the workspace owner. Members are cascade-deleted."""
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can delete it")

    await db.delete(workspace)
    await db.commit()


@router.patch("/{workspace_id}/members/{user_id}", response_model=MemberRead)
async def update_member_role(
    workspace_id: str,
    user_id: str,
    payload: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role. Caller must be an admin. Cannot change the owner's role."""
    # Load workspace to identify the owner
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Caller must be admin
    caller_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    caller_member = caller_result.scalar_one_or_none()
    if caller_member is None or caller_member.role != MemberRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Cannot change the owner's role
    if str(workspace.owner_id) == str(user_id):
        raise HTTPException(status_code=400, detail="Cannot change the role of the workspace owner")

    # Load target member
    target_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    target_member = target_result.scalar_one_or_none()
    if target_member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    target_member.role = payload.role
    await db.commit()
    await db.refresh(target_member)

    # Fetch email/display_name for response
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    return MemberRead(
        user_id=target_member.user_id,
        role=target_member.role,
        joined_at=target_member.joined_at,
        email=user.email if user else None,
        display_name=user.display_name if user else None,
    )


@router.delete("/{workspace_id}/members/{user_id}", status_code=204)
async def remove_member(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a workspace. Caller must be an admin. Cannot remove the owner."""
    # Load workspace to identify the owner
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Caller must be admin
    caller_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    caller_member = caller_result.scalar_one_or_none()
    if caller_member is None or caller_member.role != MemberRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Cannot remove the owner
    if str(workspace.owner_id) == str(user_id):
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")

    # Load target member
    target_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == user_id,
        )
    )
    target_member = target_result.scalar_one_or_none()
    if target_member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(target_member)
    await db.commit()


@router.get("/{workspace_id}/me", response_model=MemberProfileRead)
async def get_my_profile(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the caller's self-contact and profile_complete status within a workspace."""
    member_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Not a member of this workspace")

    if member.self_contact_id is None:
        raise HTTPException(status_code=404, detail="Self-contact not found for this member")

    contact_result = await db.execute(
        select(Contact).where(Contact.id == member.self_contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Self-contact not found")

    return MemberProfileRead(
        contact=ContactRead.model_validate(contact),
        profile_complete=member.profile_complete,
    )


@router.patch("/{workspace_id}/me", response_model=MemberProfileRead)
async def update_my_profile(
    workspace_id: uuid.UUID,
    payload: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the caller's self-contact profile within a workspace."""
    member_result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Not a member of this workspace")

    if member.self_contact_id is None:
        raise HTTPException(status_code=404, detail="Self-contact not found for this member")

    contact_result = await db.execute(
        select(Contact).where(Contact.id == member.self_contact_id)
    )
    contact = contact_result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Self-contact not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Validate name if provided: must not be empty after stripping
    if "name" in update_data:
        name_val = update_data["name"].strip()
        if not name_val:
            raise HTTPException(status_code=422, detail="Contact name cannot be empty")
        update_data["name"] = name_val

    for field, value in update_data.items():
        setattr(contact, field, value)

    member.profile_complete = True
    await db.commit()
    await db.refresh(contact)

    return MemberProfileRead(
        contact=ContactRead.model_validate(contact),
        profile_complete=True,
    )
