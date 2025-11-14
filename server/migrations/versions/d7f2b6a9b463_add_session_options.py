"""Add session options table and appointment reference."""

from alembic import op
import sqlalchemy as sa


revision = "d7f2b6a9b463"
down_revision = "13b662e3fe4a"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "session_options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120)),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.add_column(
        "tattoo_appointments",
        sa.Column("session_option_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_tattoo_appointments_session_option_id",
        "tattoo_appointments",
        "session_options",
        ["session_option_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_tattoo_appointments_session_option_id", "tattoo_appointments", type_="foreignkey")
    op.drop_column("tattoo_appointments", "session_option_id")
    op.drop_table("session_options")
