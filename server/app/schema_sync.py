"""Keep the database schema in step with the deployed code.

A deploy that ships a model change without applying its migration breaks every
write that touches the new columns (the booking flow failed exactly this way:
``booking_draft_session_options`` lacked the add-on discount columns, so each
checkout attempt died at the draft insert with "Unable to start booking right
now"). The hosting start command does not necessarily run ``flask db upgrade``,
so the app applies pending migrations itself the first time it serves a request.

Behaviour:

* ``AUTO_MIGRATE`` (default on) toggles the whole feature. Set it to ``0`` to
  manage the schema by hand.
* When the database is under Alembic management (an ``alembic_version`` table
  exists) pending migrations are upgraded to ``head``.
* Otherwise (a database bootstrapped with ``db.create_all()`` and never
  stamped) any column present on the models but missing from the tables is
  added, since ``create_all`` only creates whole tables and never alters
  existing ones.
* On PostgreSQL a session-level advisory lock serialises the sync across
  gunicorn workers; the others wait for the first one and then find nothing
  left to do.

The sync never raises: a failure is logged loudly and the app keeps serving so
an operator can run ``flask --app wsgi db upgrade`` manually.
"""

from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from typing import Iterator

from flask import Flask
from flask_migrate import upgrade
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.schema import CreateColumn

from .config import db

# Arbitrary constant shared by every process of this app; PostgreSQL advisory
# locks are keyed by a 64-bit integer.
SCHEMA_SYNC_LOCK_KEY = 0x4D454C4F4449  # "MELODI"

_TRUTHY = {"1", "true", "yes", "y", "on"}


def auto_migrate_enabled() -> bool:
    return (os.getenv("AUTO_MIGRATE") or "1").strip().lower() in _TRUTHY


def register_schema_sync(app: Flask, migrations_dir: str) -> None:
    """Run :func:`sync_schema` once per process, before the first request."""
    if not auto_migrate_enabled():
        app.logger.info("AUTO_MIGRATE is off; the database schema is managed manually.")
        return

    state = {"done": False}
    guard = threading.Lock()

    @app.before_request
    def _sync_schema_once():
        if state["done"]:
            return
        with guard:
            if state["done"]:
                return
            state["done"] = True
            sync_schema(app, migrations_dir)


@contextmanager
def _schema_lock(engine: Engine) -> Iterator[None]:
    """Hold a PostgreSQL advisory lock for the duration of the sync.

    Other dialects (SQLite in development and tests) are single-process here
    and need no coordination.
    """
    if engine.dialect.name != "postgresql":
        yield
        return
    connection = engine.connect()
    try:
        connection.execute(text("SELECT pg_advisory_lock(:key)"), {"key": SCHEMA_SYNC_LOCK_KEY})
        try:
            yield
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": SCHEMA_SYNC_LOCK_KEY})
    finally:
        connection.close()


def sync_schema(app: Flask, migrations_dir: str) -> None:
    """Bring the database schema up to date with the models. Never raises."""
    try:
        engine = db.engine
        with _schema_lock(engine):
            if inspect(engine).has_table("alembic_version"):
                app.logger.info("Applying pending database migrations.")
                upgrade(directory=migrations_dir, revision="head")
            else:
                app.logger.warning(
                    "Database is not under Alembic management (no alembic_version table); "
                    "adding any columns the models define that the tables lack. "
                    "Run `flask --app wsgi db stamp head` once so future deploys use migrations."
                )
                added = add_missing_columns(engine)
                if added:
                    app.logger.warning("Added missing columns: %s", ", ".join(added))
    except Exception:  # noqa: BLE001 - startup must not die because of this
        app.logger.exception(
            "Automatic schema sync failed; the database may be behind the code. "
            "Run `flask --app wsgi db upgrade` manually."
        )


def add_missing_columns(engine: Engine) -> list[str]:
    """Add model columns that existing tables lack. Returns ``table.column`` names.

    Only additive, nullable-or-defaulted columns are created, which is all
    ``create_all`` can leave behind. A NOT NULL column without a server default
    cannot be added to a populated table and is reported instead.
    """
    inspector = inspect(engine)
    added: list[str] = []
    with engine.begin() as connection:
        for table in db.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue
            existing = {column["name"] for column in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing:
                    continue
                if not column.nullable and column.server_default is None:
                    raise RuntimeError(
                        f"Column {table.name}.{column.name} is NOT NULL without a server default "
                        "and cannot be added automatically; write a migration for it."
                    )
                column_ddl = CreateColumn(column).compile(dialect=engine.dialect)
                table_name = engine.dialect.identifier_preparer.quote(table.name)
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_ddl}"))
                added.append(f"{table.name}.{column.name}")
    return added
