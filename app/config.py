from __future__ import annotations

import os
import warnings
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


def _database_url() -> str:
    # In Docker the DATABASE_URL env var points to /app/data/brain_tumor.db
    # (a named volume). Falls back to the project root for local dev.
    default_path = BASE_DIR / "brain_tumor.db"
    return os.getenv("DATABASE_URL", f"sqlite:///{default_path}")


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    if secret == "change-me-in-production":
        warnings.warn(
            "JWT_SECRET_KEY is using the default insecure value. "
            "Set a strong secret in production!",
            stacklevel=2,
        )
    return secret


def _access_token_expire_minutes() -> int:
    return int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


DATABASE_URL = _database_url()
JWT_SECRET_KEY = _jwt_secret()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _access_token_expire_minutes()

# Static file directories — can be overridden via STATIC_DIR env var
_static_root = Path(os.getenv("STATIC_DIR", str(BASE_DIR / "static")))
STATIC_DIR  = _static_root
UPLOAD_DIR  = _static_root / "uploads"
HEATMAP_DIR = _static_root / "heatmaps"
