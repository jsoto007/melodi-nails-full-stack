"""Store upload bytes in the database for redeploy-safe access.

Revision ID: 7c8f7a1be02a
Revises: b2ce42a5d5bf
Create Date: 2025-05-05 17:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7c8f7a1be02a"
down_revision = "b2ce42a5d5bf"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "stored_uploads",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255)),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("filename"),
    )


def downgrade():
    op.drop_table("stored_uploads")
