from __future__ import annotations

import base64
import importlib
import io
import os
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image


def _sample_png_base64() -> str:
    img = Image.new("RGB", (224, 224), color=(120, 180, 220))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


class DummyModel:
    def predict(self, _img, verbose=0):
        return np.array([[0.10, 0.70, 0.10, 0.10]], dtype=np.float32)


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    static_dir = tmp_path / "static"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    monkeypatch.setenv("PYTHONHASHSEED", "0")

    import app.config as config
    import app.database as database
    import app.models as models
    import app.main as main
    import app.routes.predict as predict_route

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(main)
    importlib.reload(predict_route)

    main.settings = config
    main.app.state.model = DummyModel()
    predict_route.generate_gradcam = lambda **kwargs: _sample_png_base64()
    main.tf.keras.models.load_model = lambda path: DummyModel()

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture()
def auth_token(client):
    register_payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "secret123",
        "role": "user",
    }
    client.post("/api/auth/register", json=register_payload)
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "secret123"})
    assert response.status_code == 200
    return response.json()["access_token"]