import uuid
import hashlib
import json
from datetime import datetime, timezone
import httpx
import os

from app.bridge.gstn import GSTNIntegration
from app.bridge.icegate import ICEGATEBridge
from app.bridge.mha import MHASanctionsFeed

# Service URLs from environment
VISION_SVC_URL = os.getenv("VISION_SVC_URL", "http://vision-svc:8000")
RISK_SVC_URL = os.getenv("RISK_SVC_URL", "http://risk-svc:8000")
IDENTITY_SVC_URL = os.getenv("IDENTITY_SVC_URL", "http://identity-svc:8000")

# Bridge singletons
_gstn = GSTNIntegration()
_icegate = ICEGATEBridge()
_mha = MHASanctionsFeed()


async def initiate_clearance(payload: dict):
    """Orchestrate the full clearance workflow across all three pillars.
    
    Integrates:
    - GSTN validation (importer GSTIN check)
    - ICEGATE manifest enrichment (fetch declaration details)
    - MHA/OFAC sanctions screening (entity + country checks)
    - identity-svc blockchain trust profile
    - vision-svc X-ray analysis
    - risk-svc scoring with all 25+ features
    """
    start_time = datetime.now(timezone.utc)
    clearance_id = f"CLR-{start_time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"
    container_id = payload.get("container_id")
    importer_gstin = payload.get("importer_gstin")
    xray_scan_id = payload.get("xray_scan_id")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # ── Step 0a: GSTN Validation ─────────────────────────────
            gstn_result = await _gstn.validate_gstin(importer_gstin)
            gstn_valid = gstn_result.get("valid", True)

            # ── Step 0b: ICEGATE Manifest Enrichment ─────────────────
            bill_no = payload.get("bill_no", container_id or "0000")
            manifest_data = await _icegate.fetch_manifest(bill_no, str(start_time.year))
            # Merge manifest data into payload (prefer explicit payload values)
            enriched = {**manifest_data, **{k: v for k, v in payload.items() if v}}

            # ── Step 0c: MHA/OFAC Sanctions Check ────────────────────
            importer_name = gstn_result.get("legal_name", importer_gstin)
            origin_country = enriched.get("origin_country", payload.get("origin_country", ""))

            sanctions_name = await _mha.check_entity("name", importer_name)
            sanctions_country = await _mha.check_entity("country", origin_country) if origin_country else {"match": False}

            ofac_match = sanctions_name.get("match", False) or sanctions_country.get("match", False)
            un_conflict = sanctions_country.get("match", False)

            # Seasonal smuggling index
            hs_code = enriched.get("hs_code", payload.get("hs_code", "0000.00"))
            month = start_time.month
            seasonal_index = await _mha.get_seasonal_smuggling_index(hs_code, month)

            # ── Step 1: Blockchain Identity Check ────────────────────
            identity_response = await client.get(f"{IDENTITY_SVC_URL}/importer/{importer_gstin}")
            if identity_response.status_code == 404:
                identity_data = {
                    "importer_id": importer_gstin,
                    "trust_score": 50.0,
                    "years_active": 0,
                    "violations": 0,
                    "aeo_tier": 0,
                }
            else:
                identity_data = identity_response.json()

            # ── Step 2: Vision AI Analysis ───────────────────────────
            scan_payload = {
                "scan_id": xray_scan_id,
                "dicom_url": enriched.get("manifest_url", ""),
                "simulate_anomaly": payload.get("simulate_anomaly", False),
                "confidence": payload.get("confidence", 0.05),
                "anomaly_class": payload.get("anomaly_class", "density_anomaly"),
            }
            vision_response = await client.post(f"{VISION_SVC_URL}/scan", json=scan_payload)
            vision_data = vision_response.json()

            # ── Step 3: Risk Scoring (all 25+ features) ──────────────
            # Determine origin risk using bridge data
            from app.bridge.mha import MHASanctionsFeed as _MHA
            origin_risk_val = payload.get("origin_risk", 1.0)

            risk_payload = {
                # Blockchain trust features (5)
                "blockchain_trust_score": identity_data.get("trust_score", 50.0),
                "years_active": identity_data.get("years_active", 0),
                "violation_count": len(identity_data.get("violation_history", [])),
                "aeo_tier": identity_data.get("aeo_tier", 0),
                "recent_inspection_outcome": 1 if identity_data.get("inspection_logs") else 0,
                # Vision AI features (4)
                "vision_anomaly_flag": vision_data.get("anomaly_detected", False),
                "vision_confidence": vision_data.get("confidence", 0.0),
                "vision_detection_count": len(vision_data.get("detections", [])),
                "vision_class": (
                    vision_data.get("detections", [{}])[0].get("label", "none")
                    if vision_data.get("detections")
                    else "none"
                ),
                # Cargo features (6) — enriched from ICEGATE manifest
                "cargo_hs_code": hs_code,
                "cargo_declared_value": float(enriched.get("declared_value_inr", payload.get("declared_value_inr", 0))),
                "cargo_weight": float(enriched.get("weight", payload.get("weight", 0))),
                "cargo_volume": float(enriched.get("volume", payload.get("volume", 0))),
                "cargo_category": enriched.get("category", payload.get("category", "unknown")),
                "cargo_description": enriched.get("cargo_description", ""),
                # Route features (4)
                "route_origin_risk_index": origin_risk_val,
                "route_transshipment_count": int(enriched.get("transshipment_count", payload.get("transshipment_count", 0))),
                "route_carrier_history": payload.get("carrier_history", 0),
                "route_origin_country": origin_country,
                # External intel features (5) — enriched from MHA/OFAC bridge
                "intel_ofac_match": ofac_match,
                "intel_un_conflict_flag": un_conflict,
                "intel_interpol_alert": payload.get("interpol_alert", False),
                "intel_seasonal_index": seasonal_index,
                "intel_sanctions_severity": sanctions_name.get("severity", "NONE") if sanctions_name.get("match") else "NONE",
            }
            risk_response = await client.post(f"{RISK_SVC_URL}/score", json=risk_payload)
            risk_data = risk_response.json()

            # ── Compute decision time ────────────────────────────────
            end_time = datetime.now(timezone.utc)
            decision_time_sec = (end_time - start_time).total_seconds()

            # ── Compile result ───────────────────────────────────────
            result = {
                "clearance_id": clearance_id,
                "container_id": container_id,
                "importer_gstin": importer_gstin,
                "status": "COMPLETED",
                "lane": risk_data.get("lane", "YELLOW"),
                "risk_score": risk_data.get("risk_score", 50.0),
                "gstn_validation": {
                    "valid": gstn_valid,
                    "legal_name": gstn_result.get("legal_name", ""),
                    "status": gstn_result.get("status", "Unknown"),
                },
                "sanctions_screening": {
                    "ofac_match": ofac_match,
                    "un_conflict": un_conflict,
                    "severity": sanctions_name.get("severity", "NONE") if sanctions_name.get("match") else "NONE",
                },
                "blockchain_trust": {
                    "score": identity_data.get("trust_score", 50.0),
                    "years_active": identity_data.get("years_active", 0),
                    "violations": len(identity_data.get("violation_history", [])),
                    "aeo_tier": identity_data.get("aeo_tier", 0),
                },
                "vision_result": {
                    "anomaly_detected": vision_data.get("anomaly_detected", False),
                    "heatmap_url": vision_data.get("heatmap_url", ""),
                    "confidence": vision_data.get("confidence", 0.0),
                    "detections": vision_data.get("detections", []),
                },
                "risk_features": {"top_features": risk_data.get("top_features", [])},
                "decision_time_sec": round(decision_time_sec, 2),
                "audit_hash": "",
                "officer_override": False,
                "override_reason": None,
            }

            # Generate audit hash
            audit_data = json.dumps(result, sort_keys=True)
            result["audit_hash"] = hashlib.sha256(audit_data.encode()).hexdigest()

            # Store in database
            await store_clearance_result(result)

            # Submit result back to ICEGATE
            try:
                await _icegate.submit_clearance_result(
                    clearance_id, result["lane"], decision_time_sec
                )
            except Exception:
                pass  # Non-blocking; ICEGATE submission is best-effort

            return {
                "clearance_id": clearance_id,
                "status": "PROCESSING",
                "estimated_completion_sec": 50,
                "lane": result["lane"],
                "risk_score": result["risk_score"],
                "decision_time_sec": result["decision_time_sec"],
            }

    except Exception as e:
        return {"clearance_id": clearance_id, "status": "ERROR", "error": str(e)}


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
            result["audit_hash"],
        )
