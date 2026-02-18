from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_scan_requires_scan_id():
    response = client.post("/scan", json={})
    assert response.status_code == 422


def test_scan_returns_schema():
    payload = {"scan_id": "SCN-1", "simulate_anomaly": True, "anomaly_class": "weapon"}
    response = client.post("/scan", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["scan_id"] == "SCN-1"
    assert "detections" in body
