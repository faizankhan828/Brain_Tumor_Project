from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


def _database_url() -> str:
    default_path = BASE_DIR / "brain_tumor.db"
    return os.getenv("DATABASE_URL", f"sqlite:///{default_path}")


def _jwt_secret() -> str:
    return os.getenv("JWT_SECRET_KEY", "change-me-in-production")


def _access_token_expire_minutes() -> int:
    return int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


DATABASE_URL = _database_url()
JWT_SECRET_KEY = _jwt_secret()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _access_token_expire_minutes()
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
HEATMAP_DIR = STATIC_DIR / "heatmaps"