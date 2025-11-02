import os
from pathlib import Path
from sqlalchemy.pool import StaticPool


class Config:
    def __init__(self):
        self.FLASK_ENV = os.getenv("FLASK_ENV", "development")
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            self.SQLALCHEMY_DATABASE_URI = database_url
            self.SQLALCHEMY_ENGINE_OPTIONS = {}
        else:
            default_path = Path(__file__).resolve().parent.parent / "blackink_dev.db"
            self.SQLALCHEMY_DATABASE_URI = f"sqlite+pysqlite:///{default_path}"
            self.SQLALCHEMY_ENGINE_OPTIONS = {}
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False
        self.JSON_SORT_KEYS = False
