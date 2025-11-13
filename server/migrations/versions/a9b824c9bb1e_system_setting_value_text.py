"""Allow longer system setting values."""

from alembic import op
import sqlalchemy as sa


revision = "a9b824c9bb1e"
down_revision = "885455b76470"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("system_settings", schema=None) as batch_op:
        batch_op.alter_column(
            "value",
            existing_type=sa.String(length=255),
            type_=sa.Text(),
            existing_nullable=False,
        )


def downgrade():
    with op.batch_alter_table("system_settings", schema=None) as batch_op:
        batch_op.alter_column(
            "value",
            existing_type=sa.Text(),
            type_=sa.String(length=255),
            existing_nullable=False,
        )
