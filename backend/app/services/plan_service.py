"""
Business logic: enforce per-workspace tier limits (max_members, max_contacts).
Called before every mutating contact/member operation.
"""
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.member import Member
from app.models.plan import Plan

# Default free-tier limits used when no plan row exists for a workspace.
_FREE_MAX_MEMBERS = 5
_FREE_MAX_CONTACTS = 100


async def _get_plan(workspace_id: uuid.UUID, db: AsyncSession) -> Plan:
    """Return the Plan row for *workspace_id*, or a synthetic free-tier Plan if none exists."""
    result = await db.execute(
        select(Plan).where(Plan.workspace_id == workspace_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        # Treat as free defaults — create a transient (unsaved) Plan object.
        plan = Plan(
            workspace_id=workspace_id,
            tier="free",
            max_members=_FREE_MAX_MEMBERS,
            max_contacts=_FREE_MAX_CONTACTS,
        )
    return plan


async def check_member_limit(workspace_id: uuid.UUID, db: AsyncSession) -> None:
    """Raise HTTP 402 if adding one more member would exceed the plan's max_members."""
    plan = await _get_plan(workspace_id, db)

    count_result = await db.execute(
        select(func.count()).select_from(Member).where(Member.workspace_id == workspace_id)
    )
    current = count_result.scalar_one()

    if current >= plan.max_members:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "plan_limit_exceeded",
                "resource": "members",
                "limit": plan.max_members,
                "current": current,
            },
        )


async def check_contact_limit(workspace_id: uuid.UUID, db: AsyncSession) -> None:
    """Raise HTTP 402 if adding one more contact would exceed the plan's max_contacts."""
    plan = await _get_plan(workspace_id, db)

    count_result = await db.execute(
        select(func.count()).select_from(Contact).where(Contact.workspace_id == workspace_id)
    )
    current = count_result.scalar_one()

    if current >= plan.max_contacts:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "plan_limit_exceeded",
                "resource": "contacts",
                "limit": plan.max_contacts,
                "current": current,
            },
        )
