import uuid
from datetime import datetime
from pydantic import BaseModel, model_validator


class EdgeCreate(BaseModel):
    source_contact_id: uuid.UUID
    target_contact_id: uuid.UUID
    label: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def source_and_target_differ(self) -> "EdgeCreate":
        if self.source_contact_id == self.target_contact_id:
            raise ValueError("source_contact_id and target_contact_id must be different")
        return self


class EdgeUpdate(BaseModel):
    label: str | None = None
    notes: str | None = None


class EdgeRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    source_contact_id: uuid.UUID
    target_contact_id: uuid.UUID
    label: str | None
    notes: str | None
    created_by_user_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
