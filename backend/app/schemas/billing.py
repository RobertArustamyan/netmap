from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    workspace_id: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalRequest(BaseModel):
    workspace_id: str
    return_url: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionStatusResponse(BaseModel):
    tier: str
    stripe_subscription_id: str | None
    stripe_customer_id: str | None
