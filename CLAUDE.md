# Melodi Nails — notes for Claude

## Production database

- Since 2026-11-13, prod uses the logical database `melody_nails_db` on the
  shared Oregon Render Postgres instance `shared-postgres` (the user's old
  Render workspace), reached over its External URL with `sslmode=require`.
  The service `melodi-nails-full-stack` runs in Ohio. Its URL is set by hand in
  the Render dashboard, not in the repo. Never commit credentials.
- The old Ohio instance (also called `melody_nails_db`) is rollback only and
  will be deleted.
- `server/app/config.py` reads `DATABASE_URI`, then the legacy `DATABASE_URL`
  (prod still sets this one). If neither is set, startup fails. The only
  exception is `FLASK_ENV=development` set explicitly off Render, which uses
  local SQLite.

## Local safety

- A local `.env` may point `DATABASE_URI` at a real Render database. Check
  the host before running the server, seeds, migrations or the root
  `test_api.py` / `test_app.py` scripts. Importing the `app` package runs
  `create_app()` (module-level `app = create_app()`), and that loads `.env`
  for every key not already set in the environment.
- Real tests: `pytest test_schema_sync.py test_stripe_payment_flow.py
  test_database_uri_config.py`. They set `DATABASE_URI` to SQLite themselves.
  Don't run a bare `pytest` from the repo root. It collects the scratch
  `test_*.py` scripts, which reach the DB, localhost servers and R2.
