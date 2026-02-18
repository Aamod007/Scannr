from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_score_returns_schema():
    payload = {
        "blockchain_trust_score": 70,
        "vision_anomaly_flag": True,
        "vision_confidence": 0.85,
        "cargo_declared_value": 5000000,
        "route_origin_risk_index": 2.0,
    }
    response = client.post("/score", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "lane" in body
    assert "risk_score" in body
    assert "top_features" in body
