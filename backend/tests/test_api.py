from starlette.testclient import TestClient

from app.main import app, get_store


client = TestClient(app)


def reset_store():
    store = get_store(app)
    store["importers"].clear()
    store["clearances"].clear()
    store["overrides"].clear()
    store["tariff_weights"].clear()
    store["training_queue"].clear()


def test_health():
    reset_store()
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_importer_and_profile():
    reset_store()
    payload = {
        "importer_id": "27AABCU9603R1ZN",
        "years_active": 7,
        "aeo_tier": 1,
        "violations": 0,
        "clean_inspections": 20,
    }
    response = client.post("/blockchain/importer/register", json=payload)
    assert response.status_code == 200
    profile = response.json()
    assert profile["importer_id"] == payload["importer_id"]
    profile_response = client.get(f"/blockchain/importer/{payload['importer_id']}/profile")
    assert profile_response.status_code == 200


def test_clearance_flow_and_override():
    reset_store()
    client.post(
        "/tariff/sync",
        json={"items": [{"hs_code": "8471.30", "risk_weight": 1.2}]},
    )
    initiate_payload = {
        "container_id": "TCMU-2026-00147",
        "importer_gstin": "27AABCU9603R1ZN",
        "manifest_url": "https://icegate.gov.in/manifests/1",
        "xray_scan_id": "SCN-MUM-20260205-0147",
        "declared_value_inr": 4500000,
        "hs_code": "8471.30",
        "simulate_anomaly": True,
        "anomaly_confidence": 0.9,
    }
    response = client.post("/clearance/initiate", json=initiate_payload)
    assert response.status_code == 200
    clearance_id = response.json()["clearance_id"]
    result_response = client.get(f"/clearance/{clearance_id}/result")
    assert result_response.status_code == 200
    result = result_response.json()
    assert result["risk_score"] >= 0
    override_response = client.post(
        "/officer/override",
        json={
            "clearance_id": clearance_id,
            "officer_id": "OFF-01",
            "override_to": "RED",
            "reason": "Manual review",
        },
    )
    assert override_response.status_code == 200
    updated = client.get(f"/clearance/{clearance_id}/result").json()
    assert updated["lane"] == "RED"


def test_dashboard_stats():
    reset_store()
    response = client.get("/dashboard/stats")
    assert response.status_code == 200
    body = response.json()
    assert "lane_counts" in body
