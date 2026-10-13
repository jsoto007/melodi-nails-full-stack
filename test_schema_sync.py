"""The app must repair a database whose schema is behind the deployed code.

Production broke when a deploy shipped the add-on discount columns without
applying their migration: every checkout failed at the booking-draft insert.
These tests drop those columns again and check that the first request puts
them back, for both an Alembic-managed database and a create_all-only one.
"""
import os
import sys
from datetime import datetime, timedelta

import pytest
from flask_migrate import stamp
from sqlalchemy import inspect, text

sys.path.insert(0, "./server")

from app import create_app  # noqa: E402
from app.config import db  # noqa: E402
from app.models import SessionOption  # noqa: E402

DROPPED_COLUMNS = ("list_price_cents", "discount_percent")
AFFECTED_TABLES = ("booking_draft_session_options", "appointment_session_options")


def _columns(table):
    return {column["name"] for column in inspect(db.engine).get_columns(table)}


@pytest.fixture()
def app(monkeypatch, tmp_path):
    # Alembic re-inspects the schema on its own connection, so a file-backed
    # database is required rather than an in-memory one.
    monkeypatch.setenv("DATABASE_URI", f"sqlite:///{tmp_path / 'sync.db'}")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.delenv("AUTO_MIGRATE", raising=False)
    monkeypatch.chdir(tmp_path)  # the migrations directory must not depend on the cwd

    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        db.create_all()
        for table in AFFECTED_TABLES:
            for column in DROPPED_COLUMNS:
                db.session.execute(text(f"ALTER TABLE {table} DROP COLUMN {column}"))
        db.session.commit()
        yield app
        db.session.remove()


def _initiate_booking(app, monkeypatch):
    with app.app_context():
        manicure = SessionOption(name="Manicure", category="Hands", duration_minutes=60, price_cents=4000)
        paraffin = SessionOption(name="Paraffin", category="Extras", duration_minutes=15, price_cents=1000)
        db.session.add_all([manicure, paraffin])
        db.session.commit()
        manicure_id, paraffin_id = manicure.id, paraffin.id

    start = (datetime.utcnow() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    while start.weekday() == 6:
        start += timedelta(days=1)
    monkeypatch.setattr(
        "app.routes.build_available_slots",
        lambda target_date, duration_minutes, **kwargs: (
            [{"start": start, "end": start + timedelta(minutes=duration_minutes)}],
            {},
        ),
    )
    monkeypatch.setattr(
        "app.routes.stripe.checkout.Session.create",
        lambda **kwargs: {"id": "cs_sync_123", "client_secret": "secret_sync"},
    )

    client = app.test_client()
    with client.session_transaction() as session_state:
        session_state["csrf_token"] = "csrf-token"
    return client.post(
        "/api/payments/stripe/initiate",
        json={
            "first_name": "Test",
            "last_name": "Customer",
            "email": "test@example.com",
            "phone": "5555555555",
            "session_option_ids": [manicure_id],
            "addon_session_option_ids": [paraffin_id],
            "scheduled_start": start.isoformat(),
            "pay_full_amount": False,
        },
        headers={"X-CSRF-Token": "csrf-token"},
    )


def test_pending_migration_is_applied_before_first_request(app, monkeypatch):
    with app.app_context():
        stamp(revision="4e8c1f2a9b10")  # the revision before the discount columns
        assert not _columns("booking_draft_session_options") & set(DROPPED_COLUMNS)

    response = _initiate_booking(app, monkeypatch)

    assert response.status_code == 200, response.get_json()
    with app.app_context():
        for table in AFFECTED_TABLES:
            assert set(DROPPED_COLUMNS) <= _columns(table)
        assert db.session.execute(text("SELECT version_num FROM alembic_version")).scalar() == "c2d9e4a1f7b3"


def test_missing_columns_are_added_when_database_was_never_stamped(app, monkeypatch):
    with app.app_context():
        assert not inspect(db.engine).has_table("alembic_version")

    response = _initiate_booking(app, monkeypatch)

    assert response.status_code == 200, response.get_json()
    with app.app_context():
        for table in AFFECTED_TABLES:
            assert set(DROPPED_COLUMNS) <= _columns(table)


def test_auto_migrate_can_be_switched_off(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URI", f"sqlite:///{tmp_path / 'manual.db'}")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.setenv("AUTO_MIGRATE", "0")

    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        db.create_all()
        db.session.execute(text("ALTER TABLE booking_draft_session_options DROP COLUMN discount_percent"))
        db.session.commit()

    app.test_client().get("/api/payments/config")

    with app.app_context():
        assert "discount_percent" not in _columns("booking_draft_session_options")
        db.session.remove()


def test_sync_failure_does_not_break_the_app(app, monkeypatch):
    def explode(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("app.schema_sync.upgrade", explode)
    with app.app_context():
        stamp(revision="4e8c1f2a9b10")

    response = app.test_client().get("/api/payments/config")

    assert response.status_code == 200


def test_env_toggle_parsing(monkeypatch):
    from app.schema_sync import auto_migrate_enabled

    monkeypatch.delenv("AUTO_MIGRATE", raising=False)
    assert auto_migrate_enabled() is True
    for value in ("0", "false", "no", "off"):
        monkeypatch.setenv("AUTO_MIGRATE", value)
        assert auto_migrate_enabled() is False
    monkeypatch.setenv("AUTO_MIGRATE", "TRUE")
    assert auto_migrate_enabled() is True
    assert os.getenv("AUTO_MIGRATE") == "TRUE"
