"""
Business logic: create Stripe checkout + portal sessions, handle webhook events
(subscription created/updated/deleted → update plans table).
"""
import uuid

import stripe
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.plan import Plan
from app.models.workspace import Workspace

_PRO_MAX_MEMBERS = 999999
_PRO_MAX_CONTACTS = 999999
_FREE_MAX_MEMBERS = 5
_FREE_MAX_CONTACTS = 100


def _require_stripe() -> None:
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured on this server. Set STRIPE_SECRET_KEY.",
        )
    stripe.api_key = settings.stripe_secret_key


async def _get_plan(workspace_id: uuid.UUID, db: AsyncSession) -> Plan:
    result = await db.execute(select(Plan).where(Plan.workspace_id == workspace_id))
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found for this workspace")
    return plan


async def get_or_create_stripe_customer(
    workspace_id: uuid.UUID, owner_email: str, db: AsyncSession
) -> str:
    _require_stripe()
    plan = await _get_plan(workspace_id, db)

    if plan.stripe_customer_id:
        return plan.stripe_customer_id

    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    ws_name = workspace.name if workspace else str(workspace_id)

    try:
        customer = stripe.Customer.create(
            email=owner_email,
            name=ws_name,
            metadata={"workspace_id": str(workspace_id)},
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc.user_message}") from exc

    plan.stripe_customer_id = customer.id
    await db.commit()
    return customer.id


async def create_checkout_session(
    workspace_id: uuid.UUID,
    owner_email: str,
    db: AsyncSession,
    success_url: str,
    cancel_url: str,
) -> str:
    _require_stripe()
    if not settings.stripe_price_id_pro:
        raise HTTPException(
            status_code=503,
            detail="Pro plan price is not configured. Set STRIPE_PRICE_ID_PRO.",
        )

    customer_id = await get_or_create_stripe_customer(workspace_id, owner_email, db)

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": settings.stripe_price_id_pro, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"workspace_id": str(workspace_id)},
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc.user_message}") from exc

    return session.url


async def create_portal_session(
    workspace_id: uuid.UUID, db: AsyncSession, return_url: str
) -> str:
    _require_stripe()
    plan = await _get_plan(workspace_id, db)

    if not plan.stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail="No Stripe customer found for this workspace. Complete a checkout first.",
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=plan.stripe_customer_id,
            return_url=return_url,
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc.user_message}") from exc

    return session.url


async def get_subscription_status(workspace_id: uuid.UUID, db: AsyncSession) -> dict:
    plan = await _get_plan(workspace_id, db)
    return {
        "tier": plan.tier,
        "stripe_subscription_id": plan.stripe_subscription_id,
        "stripe_customer_id": plan.stripe_customer_id,
    }


async def handle_webhook_event(payload: bytes, sig_header: str, db: AsyncSession) -> None:
    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="Stripe webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET.",
        )
    stripe.api_key = settings.stripe_secret_key

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except stripe.errors.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook parse error: {exc}") from exc

    event_type = event["type"]
    if event_type not in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        return

    subscription = event["data"]["object"]
    stripe_subscription_id: str = subscription["id"]
    stripe_customer_id: str = subscription["customer"]

    result = await db.execute(
        select(Plan).where(Plan.stripe_subscription_id == stripe_subscription_id)
    )
    plan = result.scalar_one_or_none()

    if plan is None:
        result = await db.execute(
            select(Plan).where(Plan.stripe_customer_id == stripe_customer_id)
        )
        plan = result.scalar_one_or_none()

    if plan is None:
        return

    if event_type == "customer.subscription.deleted":
        plan.tier = "free"
        plan.max_members = _FREE_MAX_MEMBERS
        plan.max_contacts = _FREE_MAX_CONTACTS
        plan.stripe_subscription_id = None
    else:
        status = subscription.get("status", "")
        if status in ("active", "trialing"):
            plan.tier = "pro"
            plan.max_members = _PRO_MAX_MEMBERS
            plan.max_contacts = _PRO_MAX_CONTACTS
            plan.stripe_subscription_id = stripe_subscription_id
            plan.stripe_customer_id = stripe_customer_id

    await db.commit()
