import uuid
from datetime import datetime

from pydantic import BaseModel


class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime
    last_active_at: datetime | None
    is_superadmin: bool
    workspace_count: int

    model_config = {"from_attributes": True}


class RecentUser(BaseModel):
    email: str
    last_active_at: datetime
    workspace_count: int


class AdminStats(BaseModel):
    total_users: int
    total_workspaces: int
    total_contacts: int
    active_users_24h: int
    active_users_7d: int
    new_users_7d: int
    new_workspaces_7d: int
    recent_users: list[RecentUser]


class AdminWorkspaceRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    created_at: datetime
    owner_email: str
    member_count: int
    contact_count: int
    plan_tier: str

    model_config = {"from_attributes": True}


class AdminPlanUpdate(BaseModel):
    tier: str
    max_members: int
    max_contacts: int


class AdminSubscriptionRead(BaseModel):
    workspace_id: uuid.UUID
    tier: str
    stripe_subscription_id: str

    model_config = {"from_attributes": True}
