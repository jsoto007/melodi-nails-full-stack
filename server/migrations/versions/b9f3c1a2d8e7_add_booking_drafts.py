"""Add booking_drafts table for pre-payment booking storage.

Revision ID: b9f3c1a2d8e7
Revises: e3a5f8b2c1d9
Create Date: 2026-03-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b9f3c1a2d8e7"
down_revision = "e3a5f8b2c1d9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "booking_drafts",
        sa.Column("id", sa.String(64), nullable=False),
        sa.Column("stripe_session_id", sa.String(255), nullable=True),
        sa.Column("first_name", sa.String(120), nullable=False),
        sa.Column("last_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(40), nullable=False),
        sa.Column("session_option_id", sa.Integer(), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("inspiration_data", sa.Text(), nullable=True),
        sa.Column("pay_full_amount", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("payment_note", sa.String(255), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("fulfilled_appointment_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["session_option_id"], ["session_options.id"]),
        sa.ForeignKeyConstraint(["fulfilled_appointment_id"], ["tattoo_appointments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_booking_drafts_stripe_session_id",
        "booking_drafts",
        ["stripe_session_id"],
        unique=True,
    )


def downgrade():
    op.drop_index("ix_booking_drafts_stripe_session_id", table_name="booking_drafts")
    op.drop_table("booking_drafts")
