"""Add multi-product booking item snapshots.

Revision ID: 4e8c1f2a9b10
Revises: b9f3c1a2d8e7
Create Date: 2026-07-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "4e8c1f2a9b10"
down_revision = "b9f3c1a2d8e7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "appointment_session_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("session_option_id", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["appointment_id"], ["tattoo_appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_option_id"], ["session_options.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_appointment_session_options_appointment_id",
        "appointment_session_options",
        ["appointment_id"],
    )
    op.create_index(
        "ix_appointment_session_options_session_option_id",
        "appointment_session_options",
        ["session_option_id"],
    )

    op.create_table(
        "booking_draft_session_options",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_draft_id", sa.String(length=64), nullable=False),
        sa.Column("session_option_id", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["booking_draft_id"], ["booking_drafts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_option_id"], ["session_options.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_booking_draft_session_options_draft_id",
        "booking_draft_session_options",
        ["booking_draft_id"],
    )
    op.create_index(
        "ix_booking_draft_session_options_session_option_id",
        "booking_draft_session_options",
        ["session_option_id"],
    )


def downgrade():
    op.drop_index(
        "ix_booking_draft_session_options_session_option_id",
        table_name="booking_draft_session_options",
    )
    op.drop_index(
        "ix_booking_draft_session_options_draft_id",
        table_name="booking_draft_session_options",
    )
    op.drop_table("booking_draft_session_options")
    op.drop_index(
        "ix_appointment_session_options_session_option_id",
        table_name="appointment_session_options",
    )
    op.drop_index(
        "ix_appointment_session_options_appointment_id",
        table_name="appointment_session_options",
    )
    op.drop_table("appointment_session_options")
