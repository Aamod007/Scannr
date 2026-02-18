from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_drift_report():
    response = client.get("/drift")
    assert response.status_code == 200
    body = response.json()
    assert "drift_detected" in body


def test_ab_report():
    response = client.get("/ab")
    assert response.status_code == 200
    body = response.json()
    assert "winner" in body
