"""Add add-on discount fields to booking item snapshots.

Revision ID: c2d9e4a1f7b3
Revises: 4e8c1f2a9b10
Create Date: 2026-10-13 19:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c2d9e4a1f7b3"
down_revision = "4e8c1f2a9b10"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("appointment_session_options", "booking_draft_session_options"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("list_price_cents", sa.Integer(), nullable=True))
            batch_op.add_column(
                sa.Column("discount_percent", sa.Integer(), nullable=False, server_default="0")
            )


def downgrade():
    for table in ("booking_draft_session_options", "appointment_session_options"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column("discount_percent")
            batch_op.drop_column("list_price_cents")
