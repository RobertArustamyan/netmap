import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.member import Member
from app.models.user import User
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    PortalRequest,
    PortalResponse,
    SubscriptionStatusResponse,
)
from app.services import billing_service

router = APIRouter(prefix="/billing", tags=["billing"])


async def _require_workspace_member(
    workspace_id: uuid.UUID, current_user: User, db: AsyncSession
) -> None:
    result = await db.execute(
        select(Member).where(
            Member.workspace_id == workspace_id,
            Member.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for upgrading to Pro."""
    workspace_id = uuid.UUID(payload.workspace_id)
    await _require_workspace_member(workspace_id, current_user, db)

    checkout_url = await billing_service.create_checkout_session(
        workspace_id=workspace_id,
        owner_email=current_user.email,
        db=db,
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
    )
    return CheckoutResponse(checkout_url=checkout_url)


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    payload: PortalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Billing Portal Session for managing an existing subscription."""
    workspace_id = uuid.UUID(payload.workspace_id)
    await _require_workspace_member(workspace_id, current_user, db)

    portal_url = await billing_service.create_portal_session(
        workspace_id=workspace_id,
        db=db,
        return_url=payload.return_url,
    )
    return PortalResponse(portal_url=portal_url)


@router.get("/status/{workspace_id}", response_model=SubscriptionStatusResponse)
async def get_status(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current plan tier and Stripe IDs for a workspace."""
    await _require_workspace_member(workspace_id, current_user, db)
    status = await billing_service.get_subscription_status(workspace_id, db)
    return SubscriptionStatusResponse(**status)


@router.post("/webhook", status_code=200)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive and process Stripe webhook events (no auth — verified by signature)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    await billing_service.handle_webhook_event(
        payload=payload,
        sig_header=sig_header,
        db=db,
    )
    return {"status": "ok"}
