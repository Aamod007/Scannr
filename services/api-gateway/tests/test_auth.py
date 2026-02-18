from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_clearance_requires_auth():
    response = client.post("/clearance/initiate", json={})
    assert response.status_code == 401


def test_clearance_with_valid_jwt():
    response = client.post(
        "/clearance/initiate",
        json={"container_id": "TCMU-001", "importer_gstin": "27AABCU9603R1ZN", "hs_code": "8471.30", "declared_value_inr": 4500000},
        headers={"Authorization": "Bearer valid-jwt-token"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "clearance_id" in body