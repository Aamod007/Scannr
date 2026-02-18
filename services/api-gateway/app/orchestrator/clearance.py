import uuid
import hashlib
import json
from datetime import datetime, timezone
import httpx
import os

# Service URLs from environment
VISION_SVC_URL = os.getenv("VISION_SVC_URL", "http://vision-svc:8000")
RISK_SVC_URL = os.getenv("RISK_SVC_URL", "http://risk-svc:8000")
IDENTITY_SVC_URL = os.getenv("IDENTITY_SVC_URL", "http://identity-svc:8000")

async def initiate_clearance(payload: dict):
    """Orchestrate the full clearance workflow across all three pillars."""
    clearance_id = f"CLR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"
    container_id = payload.get("container_id")
    importer_gstin = payload.get("importer_gstin")
    xray_scan_id = payload.get("xray_scan_id")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Step 1: Blockchain Identity Check
            identity_response = await client.get(
                f"{IDENTITY_SVC_URL}/importer/{importer_gstin}"
            )
            if identity_response.status_code == 404:
                identity_data = {
                    "importer_id": importer_gstin,
                    "trust_score": 50.0,
                    "years_active": 0,
                    "violations": 0,
                    "aeo_tier": 0
                }
            else:
                identity_data = identity_response.json()
            
            # Step 2: Vision AI Analysis
            scan_payload = {
                "scan_id": xray_scan_id,
                "dicom_url": payload.get("manifest_url", ""),
                "simulate_anomaly": payload.get("simulate_anomaly", False),
                "confidence": payload.get("confidence", 0.05),
                "anomaly_class": payload.get("anomaly_class", "density_anomaly")
            }
            vision_response = await client.post(
                f"{VISION_SVC_URL}/scan",
                json=scan_payload
            )
            vision_data = vision_response.json()
            
            # Step 3: Risk Scoring
            risk_payload = {
                "blockchain_trust_score": identity_data.get("trust_score", 50.0),
                "years_active": identity_data.get("years_active", 0),
                "violation_count": len(identity_data.get("violation_history", [])),
                "aeo_tier": identity_data.get("aeo_tier", 0),
                "vision_anomaly_flag": vision_data.get("anomaly_detected", False),
                "vision_confidence": vision_data.get("confidence", 0.0),
                "vision_detection_count": len(vision_data.get("detections", [])),
                "vision_class": vision_data.get("detections", [{}])[0].get("label", "none") if vision_data.get("detections") else "none",
                "cargo_hs_code": payload.get("hs_code", "0000.00"),
                "cargo_declared_value": payload.get("declared_value_inr", 0.0),
                "cargo_weight": payload.get("weight", 0.0),
                "cargo_volume": payload.get("volume", 0.0),
                "cargo_category": payload.get("category", "unknown"),
                "route_origin_risk_index": payload.get("origin_risk", 1.0),
                "route_transshipment_count": payload.get("transshipment_count", 0),
                "route_carrier_history": payload.get("carrier_history", 0),
                "intel_ofac_match": payload.get("ofac_match", False),
                "intel_un_conflict_flag": payload.get("un_conflict", False),
                "intel_interpol_alert": payload.get("interpol_alert", False),
                "intel_seasonal_index": payload.get("seasonal_index", 1.0)
            }
            risk_response = await client.post(
                f"{RISK_SVC_URL}/score",
                json=risk_payload
            )
            risk_data = risk_response.json()
            
            # Compile result
            result = {
                "clearance_id": clearance_id,
                "container_id": container_id,
                "importer_gstin": importer_gstin,
                "status": "COMPLETED",
                "lane": risk_data.get("lane", "YELLOW"),
                "risk_score": risk_data.get("risk_score", 50.0),
                "blockchain_trust": {
                    "score": identity_data.get("trust_score", 50.0),
                    "years_active": identity_data.get("years_active", 0),
                    "violations": len(identity_data.get("violation_history", [])),
                    "aeo_tier": identity_data.get("aeo_tier", 0)
                },
                "vision_result": {
                    "anomaly_detected": vision_data.get("anomaly_detected", False),
                    "heatmap_url": vision_data.get("heatmap_url", ""),
                    "confidence": vision_data.get("confidence", 0.0),
                    "detections": vision_data.get("detections", [])
                },
                "risk_features": {
                    "top_features": risk_data.get("top_features", [])
                },
                "decision_time_sec": 0,
                "audit_hash": "",
                "officer_override": False,
                "override_reason": None
            }
            
            # Generate audit hash
            audit_data = json.dumps(result, sort_keys=True)
            result["audit_hash"] = hashlib.sha256(audit_data.encode()).hexdigest()
            
            # Store in database
            await store_clearance_result(result)
            
            return {
                "clearance_id": clearance_id,
                "status": "PROCESSING",
                "estimated_completion_sec": 50,
                "lane": result["lane"],
                "risk_score": result["risk_score"]
            }
            
    except Exception as e:
        return {
            "clearance_id": clearance_id,
            "status": "ERROR",
            "error": str(e)
        }

async def store_clearance_result(result: dict):
    """Store clearance result in PostgreSQL."""
    from app.db.connection import get_db_pool
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO clearance_decisions (
                container_id, importer_gstin, risk_score, lane,
                vision_anomaly, vision_confidence, blockchain_trust,
                heatmap_s3_url, officer_override, override_reason, audit_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            result["container_id"],
            result["importer_gstin"],
            result["risk_score"],
            result["lane"],
            result["vision_result"]["anomaly_detected"],
            result["vision_result"]["confidence"],
            result["blockchain_trust"]["score"],
            result["vision_result"]["heatmap_url"],
            result["officer_override"],
            result["override_reason"],
            result["audit_hash"]
        )
