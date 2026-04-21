import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Plan(Base):
    __tablename__ = "plans"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=True,  # nullable=True so SQLite FK works in tests
    )
    tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    max_members: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    max_contacts: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
