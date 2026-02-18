from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Dict, Optional
from uuid import uuid4

from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import FileResponse, HTMLResponse, JSONResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def compute_trust_score(years_active: int, aeo_tier: int, violations: int, clean_inspections: int) -> float:
    score = (years_active * 10) + (aeo_tier * 20) - (violations * 15) + (clean_inspections * 0.5)
    return clamp(score, 0, 100)


def compute_risk_score(trust_score: float, anomaly_detected: bool, anomaly_confidence: Optional[float], hs_weight: float) -> float:
    base = 50
    base -= trust_score * 0.3
    base += hs_weight * 8
    if anomaly_detected:
        confidence = anomaly_confidence if anomaly_confidence is not None else 0.8
        base += 30 * confidence
    return clamp(base, 0, 100)


def lane_from_score(score: float) -> str:
    if score <= 20:
        return "GREEN"
    if score <= 60:
        return "YELLOW"
    return "RED"


def build_audit_hash(payload: Dict) -> str:
    encoded = str(payload).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


def get_store(app: Starlette) -> Dict:
    if not hasattr(app.state, "store"):
        app.state.store = {
            "importers": {},
            "clearances": {},
            "overrides": [],
            "tariff_weights": {},
            "training_queue": [],
        }
    return app.state.store


def require_field(data: Dict, key: str):
    if key not in data or data[key] in (None, ""):
        raise HTTPException(status_code=422, detail=f"Missing field: {key}")
    return data[key]


def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


async def health(request: Request):
    return JSONResponse({"status": "ok"})


async def register_importer(request: Request):
    store = get_store(request.app)
    payload = await request.json()
    importer_id = require_field(payload, "importer_id")
    if importer_id in store["importers"]:
        raise HTTPException(status_code=409, detail="Importer already exists")
    years_active = to_int(payload.get("years_active", 0))
    aeo_tier = to_int(payload.get("aeo_tier", 0))
    violations = to_int(payload.get("violations", 0))
    clean_inspections = to_int(payload.get("clean_inspections", 0))
    trust_score = compute_trust_score(years_active, aeo_tier, violations, clean_inspections)
    profile = {
        "importer_id": importer_id,
        "registration_date": utc_now(),
        "aeo_tier": aeo_tier,
        "years_active": years_active,
        "violations": violations,
        "clean_inspections": clean_inspections,
        "trust_score": trust_score,
        "last_updated": utc_now(),
    }
    store["importers"][importer_id] = profile
    return JSONResponse(profile)


async def get_importer_profile(request: Request):
    store = get_store(request.app)
    gstin = request.path_params["gstin"]
    profile = store["importers"].get(gstin)
    if not profile:
        raise HTTPException(status_code=404, detail="Importer not found")
    return JSONResponse(profile)


async def sync_tariff(request: Request):
    store = get_store(request.app)
    payload = await request.json()
    items = payload.get("items", [])
    for item in items:
        hs_code = require_field(item, "hs_code")
        store["tariff_weights"][hs_code] = {
            "hs_code": hs_code,
            "description": item.get("description"),
            "risk_weight": to_float(item.get("risk_weight", 1.0), 1.0),
            "budget_year": item.get("budget_year"),
            "effective_from": item.get("effective_from"),
            "last_synced_at": utc_now(),
        }
    return JSONResponse({"updated": len(items)})


async def list_tariff_weights(request: Request):
    store = get_store(request.app)
    return JSONResponse({"items": list(store["tariff_weights"].values())})


async def initiate_clearance(request: Request):
    store = get_store(request.app)
    payload = await request.json()
    clearance_id = f"CLR-{uuid4()}"
    importer_gstin = require_field(payload, "importer_gstin")
    importer = store["importers"].get(importer_gstin)
    trust_score = importer["trust_score"] if importer else 50
    hs_code = require_field(payload, "hs_code")
    hs_weight = store["tariff_weights"].get(hs_code, {}).get("risk_weight", 1.0)
    simulate_anomaly = bool(payload.get("simulate_anomaly", False))
    anomaly_confidence = payload.get("anomaly_confidence")
    risk_score = compute_risk_score(trust_score, simulate_anomaly, anomaly_confidence, hs_weight)
    lane = lane_from_score(risk_score)
    vision_result = {
        "anomaly_detected": simulate_anomaly,
        "heatmap_url": "https://storage.scannr.in/heatmaps/demo.png",
        "confidence": anomaly_confidence or (0.85 if simulate_anomaly else 0.05),
        "detections": [],
    }
    decision = {
        "clearance_id": clearance_id,
        "container_id": require_field(payload, "container_id"),
        "importer_gstin": importer_gstin,
        "lane": lane,
        "risk_score": round(risk_score, 2),
        "blockchain_trust": {
            "score": trust_score,
            "years_active": importer["years_active"] if importer else 0,
            "violations": importer["violations"] if importer else 0,
            "aeo_tier": importer["aeo_tier"] if importer else 0,
        },
        "vision_result": vision_result,
        "risk_features": {
            "top_features": [
                {"name": "blockchain_trust_score", "importance": 0.41},
                {"name": "hs_code_risk_weight", "importance": 0.18},
            ]
        },
        "decision_time_sec": 2,
        "audit_hash": "",
        "created_at": utc_now(),
        "status": "COMPLETED",
        "officer_override": False,
        "override_reason": None,
    }
    decision["audit_hash"] = build_audit_hash(decision)
    store["clearances"][clearance_id] = decision
    return JSONResponse(
        {
            "clearance_id": clearance_id,
            "status": "PROCESSING",
            "estimated_completion_sec": 50,
        }
    )


async def clearance_result(request: Request):
    store = get_store(request.app)
    clearance_id = request.path_params["clearance_id"]
    decision = store["clearances"].get(clearance_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Clearance not found")
    return JSONResponse(decision)


async def officer_override(request: Request):
    store = get_store(request.app)
    payload = await request.json()
    clearance_id = require_field(payload, "clearance_id")
    decision = store["clearances"].get(clearance_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Clearance not found")
    override_to = require_field(payload, "override_to")
    reason = require_field(payload, "reason")
    officer_id = require_field(payload, "officer_id")
    decision["lane"] = override_to
    decision["officer_override"] = True
    decision["override_reason"] = reason
    decision["audit_hash"] = build_audit_hash(decision)
    override_record = {
        "id": str(uuid4()),
        "clearance_id": clearance_id,
        "officer_id": officer_id,
        "override_lane": override_to,
        "reason": reason,
        "created_at": utc_now(),
    }
    store["overrides"].append(override_record)
    store["training_queue"].append(
        {
            "id": str(uuid4()),
            "clearance_id": clearance_id,
            "label_correct": False,
            "officer_label": override_to,
            "flagged_at": utc_now(),
        }
    )
    return JSONResponse({"status": "ok", "override_id": override_record["id"]})


async def dashboard_stats(request: Request):
    store = get_store(request.app)
    totals = {"GREEN": 0, "YELLOW": 0, "RED": 0}
    for decision in store["clearances"].values():
        totals[decision["lane"]] = totals.get(decision["lane"], 0) + 1
    return JSONResponse(
        {
            "total_clearances": len(store["clearances"]),
            "lane_counts": totals,
            "overrides": len(store["overrides"]),
            "last_updated": utc_now(),
        }
    )


root_path = Path(__file__).resolve().parents[2]
ui_path = root_path / "ui"
routes = [
    Route("/health", health, methods=["GET"]),
    Route("/blockchain/importer/register", register_importer, methods=["POST"]),
    Route("/blockchain/importer/{gstin}/profile", get_importer_profile, methods=["GET"]),
    Route("/tariff/sync", sync_tariff, methods=["POST"]),
    Route("/tariff/weights", list_tariff_weights, methods=["GET"]),
    Route("/clearance/initiate", initiate_clearance, methods=["POST"]),
    Route("/clearance/{clearance_id}/result", clearance_result, methods=["GET"]),
    Route("/officer/override", officer_override, methods=["POST"]),
    Route("/dashboard/stats", dashboard_stats, methods=["GET"]),
]

if ui_path.exists():
    routes.append(Mount("/ui", app=StaticFiles(directory=ui_path), name="ui"))


async def serve_ui(request: Request):
    index_file = ui_path / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="UI not found")
    return FileResponse(index_file)


routes.append(Route("/", serve_ui, methods=["GET"]))

app = Starlette(routes=routes)
