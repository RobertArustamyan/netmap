import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class ContactCreate(BaseModel):
    name: str
    job_title: str | None = None
    company: str | None = None
    linkedin_url: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Contact name cannot be empty")
        return v


class ContactUpdate(BaseModel):
    name: str | None = None
    job_title: str | None = None
    company: str | None = None
    linkedin_url: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


class ContactRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    added_by_user_id: uuid.UUID | None
    name: str
    job_title: str | None
    company: str | None
    linkedin_url: str | None
    email: str | None
    phone: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
