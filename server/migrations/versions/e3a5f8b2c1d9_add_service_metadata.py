"""Add tagline, description, and category to session_options.

Revision ID: e3a5f8b2c1d9
Revises: 7a2b560d544d
Create Date: 2026-03-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "e3a5f8b2c1d9"
down_revision = "7a2b560d544d"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("session_options", sa.Column("tagline", sa.String(120), nullable=True))
    op.add_column("session_options", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("session_options", sa.Column("category", sa.String(80), nullable=True))


def downgrade():
    op.drop_column("session_options", "category")
    op.drop_column("session_options", "description")
    op.drop_column("session_options", "tagline")
