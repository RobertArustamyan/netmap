"""
Business logic for the superadmin panel.

All functions accept an AsyncSession and return plain dicts / ORM objects;
HTTP concerns live in the route layer.
"""
import uuid

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.member import Member
from app.models.plan import Plan
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.admin import (
    AdminStats,
    AdminSubscriptionRead,
    AdminUserRead,
    AdminWorkspaceRead,
    RecentUser,
)


async def list_users(db: AsyncSession) -> list[AdminUserRead]:
    """Return every user with their owned-workspace count."""
    owned_count = (
        select(Workspace.owner_id, func.count(Workspace.id).label("wcount"))
        .group_by(Workspace.owner_id)
        .subquery()
    )

    rows = await db.execute(
        select(
            User.id,
            User.email,
            User.created_at,
            User.last_active_at,
            User.is_superadmin,
            func.coalesce(owned_count.c.wcount, 0).label("workspace_count"),
        )
        .outerjoin(owned_count, User.id == owned_count.c.owner_id)
        .order_by(User.created_at.desc())
    )

    return [
        AdminUserRead(
            id=row.id,
            email=row.email,
            created_at=row.created_at,
            last_active_at=row.last_active_at,
            is_superadmin=row.is_superadmin,
            workspace_count=row.workspace_count,
        )
        for row in rows.all()
    ]


async def get_user(uid: uuid.UUID, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.id == uid))
    return result.scalar_one_or_none()


async def delete_user(uid: uuid.UUID, db: AsyncSession) -> None:
    """Hard-delete a user row. Cascades via FK to memberships, owned workspaces, etc."""
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        return
    await db.delete(user)
    await db.commit()


async def list_workspaces(db: AsyncSession) -> list[AdminWorkspaceRead]:
    """Return all workspaces with owner email, member count, contact count, and plan tier."""
    member_counts = (
        select(Member.workspace_id, func.count(Member.id).label("mcount"))
        .group_by(Member.workspace_id)
        .subquery()
    )
    contact_counts = (
        select(Contact.workspace_id, func.count(Contact.id).label("ccount"))
        .group_by(Contact.workspace_id)
        .subquery()
    )

    rows = await db.execute(
        select(
            Workspace.id,
            Workspace.name,
            Workspace.slug,
            Workspace.created_at,
            User.email.label("owner_email"),
            func.coalesce(member_counts.c.mcount, 0).label("member_count"),
            func.coalesce(contact_counts.c.ccount, 0).label("contact_count"),
            func.coalesce(Plan.tier, "free").label("plan_tier"),
        )
        .join(User, Workspace.owner_id == User.id)
        .outerjoin(member_counts, Workspace.id == member_counts.c.workspace_id)
        .outerjoin(contact_counts, Workspace.id == contact_counts.c.workspace_id)
        .outerjoin(Plan, Workspace.id == Plan.workspace_id)
        .order_by(Workspace.created_at.desc())
    )

    return [
        AdminWorkspaceRead(
            id=row.id,
            name=row.name,
            slug=row.slug,
            created_at=row.created_at,
            owner_email=row.owner_email,
            member_count=row.member_count,
            contact_count=row.contact_count,
            plan_tier=row.plan_tier,
        )
        for row in rows.all()
    ]


async def get_workspace(wid: uuid.UUID, db: AsyncSession) -> Workspace | None:
    result = await db.execute(select(Workspace).where(Workspace.id == wid))
    return result.scalar_one_or_none()


async def update_workspace_plan(
    workspace_id: uuid.UUID,
    tier: str,
    max_members: int,
    max_contacts: int,
    db: AsyncSession,
) -> Plan:
    """Upsert the Plan row for a workspace and return the updated record."""
    result = await db.execute(
        select(Plan).where(Plan.workspace_id == workspace_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        plan = Plan(workspace_id=workspace_id)
        db.add(plan)

    plan.tier = tier
    plan.max_members = max_members
    plan.max_contacts = max_contacts

    await db.commit()
    await db.refresh(plan)
    return plan


async def list_subscriptions(db: AsyncSession) -> list[AdminSubscriptionRead]:
    """Return all Plan rows that have a Stripe subscription ID attached."""
    rows = await db.execute(
        select(Plan).where(Plan.stripe_subscription_id.is_not(None))
    )
    return [
        AdminSubscriptionRead(
            workspace_id=plan.workspace_id,
            tier=plan.tier,
            stripe_subscription_id=plan.stripe_subscription_id,  # type: ignore[arg-type]
        )
        for plan in rows.scalars().all()
    ]


async def get_platform_stats(db: AsyncSession) -> AdminStats:
    """Aggregate platform-wide stats for the admin analytics page."""
    cutoff_24h = func.now() - text("interval '24 hours'")
    cutoff_7d = func.now() - text("interval '7 days'")

    # Scalar counts
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_workspaces = (await db.execute(select(func.count(Workspace.id)))).scalar_one()
    total_contacts = (await db.execute(select(func.count(Contact.id)))).scalar_one()

    active_users_24h = (
        await db.execute(
            select(func.count(User.id)).where(User.last_active_at > cutoff_24h)
        )
    ).scalar_one()

    active_users_7d = (
        await db.execute(
            select(func.count(User.id)).where(User.last_active_at > cutoff_7d)
        )
    ).scalar_one()

    new_users_7d = (
        await db.execute(
            select(func.count(User.id)).where(User.created_at > cutoff_7d)
        )
    ).scalar_one()

    new_workspaces_7d = (
        await db.execute(
            select(func.count(Workspace.id)).where(Workspace.created_at > cutoff_7d)
        )
    ).scalar_one()

    # Recent users: last 10 by last_active_at desc (non-null only)
    owned_count = (
        select(Workspace.owner_id, func.count(Workspace.id).label("wcount"))
        .group_by(Workspace.owner_id)
        .subquery()
    )
    recent_rows = await db.execute(
        select(
            User.email,
            User.last_active_at,
            func.coalesce(owned_count.c.wcount, 0).label("workspace_count"),
        )
        .outerjoin(owned_count, User.id == owned_count.c.owner_id)
        .where(User.last_active_at.is_not(None))
        .order_by(User.last_active_at.desc())
        .limit(10)
    )

    recent_users = [
        RecentUser(
            email=row.email,
            last_active_at=row.last_active_at,
            workspace_count=row.workspace_count,
        )
        for row in recent_rows.all()
    ]

    return AdminStats(
        total_users=total_users,
        total_workspaces=total_workspaces,
        total_contacts=total_contacts,
        active_users_24h=active_users_24h,
        active_users_7d=active_users_7d,
        new_users_7d=new_users_7d,
        new_workspaces_7d=new_workspaces_7d,
        recent_users=recent_users,
    )
