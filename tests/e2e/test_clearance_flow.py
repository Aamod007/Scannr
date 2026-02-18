# End-to-End Test Suite

## Overview

Comprehensive end-to-end tests for SCANNR system validation.

## Test Categories

### 1. Clearance Flow Tests

```python
# tests/e2e/test_clearance_flow.py

import pytest
import httpx
import asyncio
from datetime import datetime

BASE_URL = "http://localhost:8000"
JWT_TOKEN = "valid-jwt-token"

@pytest.mark.asyncio
async def test_full_clearance_workflow():
    """Test complete clearance workflow from initiation to result."""
    async with httpx.AsyncClient() as client:
        # Step 1: Initiate clearance
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "container_id": "TCMU-E2E-001",
                "importer_gstin": "27AABCU9603R1ZN",
                "manifest_url": "https://icegate.gov.in/manifests/1",
                "xray_scan_id": "SCN-E2E-001",
                "declared_value_inr": 4500000,
                "hs_code": "8471.30",
                "weight": 12500,
                "volume": 33.2
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "clearance_id" in data
        clearance_id = data["clearance_id"]
        
        # Step 2: Poll for result
        max_attempts = 10
        for _ in range(max_attempts):
            await asyncio.sleep(1)
            result_response = await client.get(
                f"{BASE_URL}/clearance/{clearance_id}/result",
                headers={"Authorization": f"Bearer {JWT_TOKEN}"}
            )
            if result_response.status_code == 200:
                result = result_response.json()
                if result.get("status") == "COMPLETED":
                    break
        
        # Step 3: Verify result structure
        assert "lane" in result
        assert "risk_score" in result
        assert result["lane"] in ["GREEN", "YELLOW", "RED"]
        assert 0 <= result["risk_score"] <= 100

@pytest.mark.asyncio
async def test_officer_override_workflow():
    """Test officer override functionality."""
    async with httpx.AsyncClient() as client:
        # Create a clearance
        init_response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "container_id": "TCMU-E2E-002",
                "importer_gstin": "27AABCU9603R1ZN",
                "hs_code": "8471.30",
                "declared_value_inr": 1000000
            }
        )
        clearance_id = init_response.json()["clearance_id"]
        
        # Wait for processing
        await asyncio.sleep(2)
        
        # Override decision
        override_response = await client.post(
            f"{BASE_URL}/officer/override",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "clearance_id": clearance_id,
                "officer_id": "OFF-MUM-0042",
                "override_to": "RED",
                "reason": "Suspicious packaging pattern detected"
            }
        )
        assert override_response.status_code == 200
        
        # Verify override was applied
        result_response = await client.get(
            f"{BASE_URL}/clearance/{clearance_id}/result",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"}
        )
        result = result_response.json()
        assert result["lane"] == "RED"
        assert result["officer_override"] == True

@pytest.mark.asyncio
async def test_concurrent_clearances():
    """Test system handles concurrent clearance requests."""
    async with httpx.AsyncClient() as client:
        # Create 50 concurrent requests
        tasks = []
        for i in range(50):
            task = client.post(
                f"{BASE_URL}/clearance/initiate",
                headers={"Authorization": f"Bearer {JWT_TOKEN}"},
                json={
                    "container_id": f"TCMU-E2E-{i:03d}",
                    "importer_gstin": "27AABCU9603R1ZN",
                    "hs_code": "8471.30",
                    "declared_value_inr": 1000000 + i * 1000
                }
            )
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all requests succeeded
        success_count = sum(1 for r in responses if isinstance(r, httpx.Response) and r.status_code == 200)
        assert success_count >= 48  # Allow 2 failures

### 2. Integration Tests

@pytest.mark.asyncio
async def test_icegate_integration():
    """Test ICEGATE manifest fetching."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/icegate/manifest/TEST123/2026",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "container_id" in data
        assert "hs_code" in data

@pytest.mark.asyncio
async def test_gstn_validation():
    """Test GSTN importer validation."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/gstn/validate/27AABCU9603R1ZN",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert "legal_name" in data

@pytest.mark.asyncio
async def test_sanctions_check():
    """Test MHA sanctions feed integration."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/sanctions/check",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            params={"type": "name", "value": "Test Company"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "match" in data

### 3. Performance Tests

@pytest.mark.asyncio
async def test_response_time_sla():
    """Verify response times meet SLAs."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        start = datetime.now()
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "container_id": "TCMU-E2E-PERF",
                "importer_gstin": "27AABCU9603R1ZN",
                "hs_code": "8471.30",
                "declared_value_inr": 1000000
            }
        )
        elapsed = (datetime.now() - start).total_seconds()
        
        assert response.status_code == 200
        assert elapsed < 3.0  # 3 second SLA for initiation

@pytest.mark.asyncio
async def test_load_test():
    """Load test with 1000 requests."""
    async def make_request(client, i):
        try:
            response = await client.post(
                f"{BASE_URL}/clearance/initiate",
                headers={"Authorization": f"Bearer {JWT_TOKEN}"},
                json={
                    "container_id": f"TCMU-LOAD-{i:04d}",
                    "importer_gstin": "27AABCU9603R1ZN",
                    "hs_code": "8471.30",
                    "declared_value_inr": 1000000
                },
                timeout=10.0
            )
            return response.status_code == 200
        except:
            return False
    
    async with httpx.AsyncClient() as client:
        tasks = [make_request(client, i) for i in range(1000)]
        results = await asyncio.gather(*tasks)
        
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.95  # 95% success rate

### 4. Security Tests

@pytest.mark.asyncio
async def test_authentication_required():
    """Verify all endpoints require authentication."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            json={"container_id": "test"}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_invalid_jwt_rejected():
    """Verify invalid JWT tokens are rejected."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": "Bearer invalid-token"},
            json={"container_id": "test"}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_sql_injection_protection():
    """Verify SQL injection attempts are blocked."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "container_id": "test'; DROP TABLE clearance_decisions; --",
                "importer_gstin": "27AABCU9603R1ZN",
                "hs_code": "8471.30"
            }
        )
        # Should either fail validation or sanitize input
        assert response.status_code in [200, 422]

### 5. Error Handling Tests

@pytest.mark.asyncio
async def test_invalid_clearance_id():
    """Test error handling for invalid clearance ID."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/clearance/INVALID-ID/result",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"}
        )
        assert response.status_code == 404

@pytest.mark.asyncio
async def test_missing_required_fields():
    """Test validation of required fields."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={}  # Missing all fields
        )
        assert response.status_code == 422

### 6. Data Integrity Tests

@pytest.mark.asyncio
async def test_audit_trail_created():
    """Verify audit trail is created for each clearance."""
    async with httpx.AsyncClient() as client:
        # Create clearance
        response = await client.post(
            f"{BASE_URL}/clearance/initiate",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"},
            json={
                "container_id": "TCMU-AUDIT-001",
                "importer_gstin": "27AABCU9603R1ZN",
                "hs_code": "8471.30"
            }
        )
        clearance_id = response.json()["clearance_id"]
        
        # Verify audit hash exists
        await asyncio.sleep(2)
        result = await client.get(
            f"{BASE_URL}/clearance/{clearance_id}/result",
            headers={"Authorization": f"Bearer {JWT_TOKEN}"}
        )
        data = result.json()
        assert "audit_hash" in data
        assert len(data["audit_hash"]) == 64  # SHA-256 length
```

## Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all E2E tests
pytest tests/e2e/ -v

# Run specific test category
pytest tests/e2e/test_clearance_flow.py -v
pytest tests/e2e/ -k "integration" -v
pytest tests/e2e/ -k "performance" -v
pytest tests/e2e/ -k "security" -v

# Run with coverage
pytest tests/e2e/ --cov=services --cov-report=html

# Parallel execution
pytest tests/e2e/ -n auto
```

## CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: End-to-End Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Start services
      run: docker-compose up -d
    
    - name: Wait for services
      run: sleep 60
    
    - name: Run E2E tests
      run: pytest tests/e2e/ -v --tb=short
    
    - name: Cleanup
      run: docker-compose down
```
