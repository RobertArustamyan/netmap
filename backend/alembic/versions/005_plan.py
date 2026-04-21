"""Add plans table for workspace plan/tier enforcement

Revision ID: 005
Revises: 004
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plans",
        sa.Column(
            "workspace_id",
            UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("tier", sa.String(20), nullable=False, server_default="free"),
        sa.Column("max_members", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_contacts", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("plans")
