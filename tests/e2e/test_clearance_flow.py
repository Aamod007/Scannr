"""
End-to-End Test Suite for SCANNR

Run with: pytest tests/e2e/ -v
"""

import pytest
import httpx
import asyncio
from datetime import datetime

BASE_URL = "http://localhost:8000"
JWT_TOKEN = "valid-jwt-token"


@pytest.mark.asyncio
async def test_health_endpoints():
    """Test all service health endpoints."""
    services = [
        ("api-gateway", 8000),
        ("vision-svc", 8001),
        ("risk-svc", 8002),
        ("identity-svc", 8005),
    ]
    
    for service, port in services:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://localhost:{port}/health")
            assert response.status_code == 200
            assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_clearance_initiation():
    """Test clearance initiation endpoint."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "container_id": "TCMU-E2E-001",
                "importer_gstin": "27AABCU9603R1ZN",
                "hs_code": "8471.30",
                "declared_value_inr": 4500000,
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "clearance_id" in data
        assert data["status"] == "PROCESSING"


@pytest.mark.asyncio
async def test_authentication_required():
    """Test that endpoints require authentication."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            json={"container_id": "test"}
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_vision_service_scan():
    """Test vision service scan endpoint."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8001/scan",
            json={
                "scan_id": "SCN-E2E-001",
                "simulate_anomaly": True,
                "anomaly_class": "weapon"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "detections" in data


@pytest.mark.asyncio
async def test_risk_service_scoring():
    """Test risk service scoring endpoint."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8002/score",
            json={
                "blockchain_trust_score": 70,
                "vision_anomaly_flag": True,
                "cargo_declared_value": 5000000,
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "lane" in data
        assert data["lane"] in ["GREEN", "YELLOW", "RED"]
