"""The app must never guess a remote database when none is configured.

config.py used to fall back to a hardcoded Render Postgres URL, so a missing
DATABASE_URI silently pointed the app at whatever that URL was. Now a missing
variable stops startup, except for an explicit local development run.

These tests call the config helpers directly instead of create_app(), because
create_app() runs load_dotenv() and could pick up a developer's real .env.
"""
import sys

import pytest
from flask import Flask

sys.path.insert(0, "./server")

from app import config  # noqa: E402

DB_VARS = ("DATABASE_URI", "DATABASE_URL", "FLASK_ENV", "RENDER")


@pytest.fixture()
def bare_env(monkeypatch):
    for name in DB_VARS:
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


def test_database_uri_wins(bare_env):
    bare_env.setenv("DATABASE_URI", "sqlite:///primary.db")
    bare_env.setenv("DATABASE_URL", "sqlite:///legacy.db")
    assert config._resolve_database_uri(Flask(__name__)) == "sqlite:///primary.db"


def test_legacy_database_url_still_works(bare_env):
    bare_env.setenv("DATABASE_URL", "sqlite:///legacy.db")
    assert config._resolve_database_uri(Flask(__name__)) == "sqlite:///legacy.db"


@pytest.mark.parametrize(
    "env",
    [
        {},  # FLASK_ENV unset must not count as development
        {"FLASK_ENV": "production"},
        {"FLASK_ENV": "staging"},
        {"FLASK_ENV": "development", "RENDER": "true"},
        {"DATABASE_URI": "", "DATABASE_URL": "", "FLASK_ENV": "production"},
    ],
)
def test_missing_database_url_raises(bare_env, env):
    for name, value in env.items():
        bare_env.setenv(name, value)
    with pytest.raises(RuntimeError, match="DATABASE_URI is not set"):
        config._resolve_database_uri(Flask(__name__))


def test_explicit_development_uses_local_sqlite(bare_env):
    bare_env.setenv("FLASK_ENV", "development")
    uri = config._resolve_database_uri(Flask(__name__))
    assert uri == f"sqlite:///{config._DEFAULT_DB_PATH}"
    assert uri.startswith("sqlite:///")


def test_configure_app_fails_fast_without_database(bare_env):
    bare_env.setenv("FLASK_ENV", "production")
    app = Flask(__name__)
    with pytest.raises(RuntimeError, match="DATABASE_URI is not set"):
        config.configure_app(app)
    assert "SQLALCHEMY_DATABASE_URI" not in app.config
