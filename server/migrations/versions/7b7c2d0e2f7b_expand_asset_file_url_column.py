"""Expand appointment asset file_url column to store data URLs

Revision ID: 7b7c2d0e2f7b
Revises: 3f4ed0a5ecdf
Create Date: 2025-05-05 16:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7b7c2d0e2f7b"
down_revision = "3f4ed0a5ecdf"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("appointment_assets", schema=None) as batch_op:
        batch_op.alter_column("file_url", type_=sa.Text(), existing_nullable=True)


def downgrade():
    with op.batch_alter_table("appointment_assets", schema=None) as batch_op:
        batch_op.alter_column("file_url", type_=sa.String(length=512), existing_nullable=True)
