from __future__ import annotations

import io

from PIL import Image


def _sample_upload() -> tuple[str, io.BytesIO, str]:
    image = Image.new("RGB", (224, 224), color=(120, 180, 220))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return ("scan.png", buffer, "image/png")


def test_login_and_register(client):
    register_response = client.post(
        "/api/auth/register",
        json={"name": "Ada Lovelace", "email": "ada@example.com", "password": "pass1234", "role": "user"},
    )
    assert register_response.status_code == 200
    payload = register_response.json()
    assert payload["access_token"]
    assert payload["token_type"] == "bearer"

    login_response = client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "pass1234"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["access_token"]


def test_predict_history_and_report(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    upload = _sample_upload()
    predict_response = client.post(
        "/api/predict",
        files={"file": upload},
        headers=headers,
    )
    assert predict_response.status_code == 200
    predict_data = predict_response.json()
    assert predict_data["class"]
    assert predict_data["confidence"] >= 0
    assert len(predict_data["probabilities"]) == 4
    assert predict_data["scan_id"] > 0

    history_response = client.get("/api/history?page=1&size=10", headers=headers)
    assert history_response.status_code == 200
    history_data = history_response.json()
    assert history_data["total"] >= 1
    assert history_data["items"][0]["thumbnail"].startswith("/static/heatmaps/")

    report_response = client.get(f"/api/report/{predict_data['scan_id']}", headers=headers)
    assert report_response.status_code == 200
    assert report_response.headers["content-type"].startswith("application/pdf")
    assert report_response.content[:4] == b"%PDF"