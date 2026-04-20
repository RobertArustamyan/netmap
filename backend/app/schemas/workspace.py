import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator
import re

from app.models.member import MemberRole


class WorkspaceCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Workspace name cannot be empty")
        return v


class WorkspaceUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Workspace name cannot be empty")
        return v


class MemberRoleUpdate(BaseModel):
    role: MemberRole


class WorkspaceRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    owner_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceWithInvite(WorkspaceRead):
    invite_url: str  # populated by the route handler


class MemberRead(BaseModel):
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    email: str | None = None
    display_name: str | None = None

    model_config = {"from_attributes": True}


class InviteInfo(BaseModel):
    workspace_id: uuid.UUID
    workspace_name: str
    workspace_slug: str
