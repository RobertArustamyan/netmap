"""Add is_self to contacts; self_contact_id and profile_complete to members

Revision ID: 004
Revises: 003
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_self column to contacts
    op.add_column(
        "contacts",
        sa.Column("is_self", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
    )

    # Add self_contact_id (nullable FK → contacts.id) to members
    op.add_column(
        "members",
        sa.Column(
            "self_contact_id",
            UUID(as_uuid=True),
            sa.ForeignKey("contacts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Add profile_complete column to members
    op.add_column(
        "members",
        sa.Column(
            "profile_complete",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
    )


def downgrade() -> None:
    op.drop_column("members", "profile_complete")
    op.drop_column("members", "self_contact_id")
    op.drop_column("contacts", "is_self")
