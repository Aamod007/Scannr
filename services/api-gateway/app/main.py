import asyncio
import json
import os

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route, WebSocketRoute
from starlette.websockets import WebSocket

import httpx

from app.orchestrator.clearance import initiate_clearance
from app.orchestrator.override import officer_override
from app.orchestrator.result import clearance_result
from app.middleware.auth import check_jwt
from app.bridge.gstn import GSTNIntegration
from app.bridge.icegate import ICEGATEBridge
from app.bridge.mha import MHASanctionsFeed
from app.db.connection import get_db_pool

IDENTITY_SVC_URL = os.getenv("IDENTITY_SVC_URL", "http://identity-svc:8000")


# ─── Health ───────────────────────────────────────────────────────────

async def health(request):
    return JSONResponse({"status": "ok"})


# ─── Auth helper ──────────────────────────────────────────────────────

def _auth(request: Request) -> dict:
    """Extract and validate JWT from request, return claims or raise."""
    auth_header = request.headers.get("Authorization")
    return check_jwt(auth_header)  # raises ValueError on failure


# ─── Clearance endpoints ─────────────────────────────────────────────

async def clearance_initiate(request: Request):
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    payload = await request.json()
    result = await initiate_clearance(payload)
    return JSONResponse(result)


async def clearance_result_handler(request: Request):
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    clearance_id = request.path_params["clearance_id"]
    result = await clearance_result(clearance_id)
    return JSONResponse(result)


async def officer_override_handler(request: Request):
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    payload = await request.json()
    result = await officer_override(payload)
    return JSONResponse(result)


# ─── Dashboard stats ─────────────────────────────────────────────────

async def dashboard_stats(request: Request):
    """GET /dashboard/stats — real-time port statistics."""
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    stats = await _compute_stats()
    return JSONResponse(stats)


async def _compute_stats() -> dict:
    """Aggregate statistics from PostgreSQL clearance_decisions table."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            total = await conn.fetchval(
                "SELECT COUNT(*) FROM clearance_decisions WHERE created_at >= CURRENT_DATE"
            )
            green = await conn.fetchval(
                "SELECT COUNT(*) FROM clearance_decisions WHERE lane = 'GREEN' AND created_at >= CURRENT_DATE"
            )
            yellow = await conn.fetchval(
                "SELECT COUNT(*) FROM clearance_decisions WHERE lane = 'YELLOW' AND created_at >= CURRENT_DATE"
            )
            red = await conn.fetchval(
                "SELECT COUNT(*) FROM clearance_decisions WHERE lane = 'RED' AND created_at >= CURRENT_DATE"
            )
            overrides = await conn.fetchval(
                "SELECT COUNT(*) FROM officer_overrides WHERE created_at >= CURRENT_DATE"
            )
            avg_risk = await conn.fetchval(
                "SELECT COALESCE(AVG(risk_score), 0) FROM clearance_decisions WHERE created_at >= CURRENT_DATE"
            )
            recent = await conn.fetch(
                """SELECT id, container_id, importer_gstin, risk_score, lane,
                          vision_anomaly, officer_override, created_at
                   FROM clearance_decisions
                   ORDER BY created_at DESC LIMIT 20"""
            )
    except Exception:
        # DB unavailable — return placeholder stats
        return {
            "total_scanned_today": 0,
            "green_lane": 0,
            "yellow_lane": 0,
            "red_lane": 0,
            "officer_overrides_today": 0,
            "avg_risk_score": 0.0,
            "recent_clearances": [],
            "error": "database_unavailable",
        }

    return {
        "total_scanned_today": total or 0,
        "green_lane": green or 0,
        "yellow_lane": yellow or 0,
        "red_lane": red or 0,
        "officer_overrides_today": overrides or 0,
        "avg_risk_score": round(float(avg_risk or 0), 2),
        "recent_clearances": [
            {
                "clearance_id": str(r["id"]),
                "container_id": r["container_id"],
                "importer_gstin": r["importer_gstin"],
                "risk_score": float(r["risk_score"]),
                "lane": r["lane"],
                "vision_anomaly": r["vision_anomaly"],
                "officer_override": r["officer_override"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in recent
        ],
    }


# ─── Blockchain / identity endpoints ────────────────────────────────

async def blockchain_register_importer(request: Request):
    """POST /blockchain/importer/register — register new importer on Fabric."""
    try:
        claims = _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    # Only admins can register
    if claims.get("role") not in ("admin", "cbic_admin"):
        return JSONResponse({"error": "Forbidden — CBIC admin required"}, status_code=403)

    payload = await request.json()
    gstin = payload.get("importer_gstin") or payload.get("gstin")
    if not gstin:
        return JSONResponse({"error": "importer_gstin is required"}, status_code=400)

    # Validate GSTIN via GSTN bridge
    gstn_bridge = GSTNIntegration()
    gstn_validation = await gstn_bridge.validate_gstin(gstin)
    if not gstn_validation.get("valid"):
        return JSONResponse({"error": "Invalid GSTIN", "details": gstn_validation}, status_code=400)

    # Forward to identity-svc
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{IDENTITY_SVC_URL}/importer/register",
                json={
                    "importer_id": gstin,
                    "years_active": payload.get("years_active", 0),
                    "aeo_tier": payload.get("aeo_tier", 0),
                    "violations": payload.get("violations", 0),
                    "clean_inspections": payload.get("clean_inspections", 0),
                },
            )
            identity_result = resp.json()
    except Exception as e:
        identity_result = {"error": f"identity-svc unreachable: {e}"}

    return JSONResponse({
        "status": "registered",
        "gstin": gstin,
        "gstn_validation": gstn_validation,
        "blockchain": identity_result,
    })


async def blockchain_importer_profile(request: Request):
    """GET /blockchain/importer/{gstin}/profile — fetch importer trust profile."""
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    gstin = request.path_params["gstin"]

    # Fetch from identity-svc (Fabric)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{IDENTITY_SVC_URL}/importer/{gstin}")
            if resp.status_code == 404:
                return JSONResponse({"error": "Importer not found"}, status_code=404)
            profile = resp.json()
    except Exception as e:
        profile = {"error": f"identity-svc unreachable: {e}"}

    # Enrich with GSTN compliance data
    gstn_bridge = GSTNIntegration()
    compliance = await gstn_bridge.check_filing_compliance(gstin)

    # Enrich with sanctions check
    mha_feed = MHASanctionsFeed()
    sanctions = await mha_feed.check_entity("name", profile.get("legal_name", gstin))

    return JSONResponse({
        "gstin": gstin,
        "blockchain_profile": profile,
        "gstn_compliance": compliance,
        "sanctions_check": sanctions,
    })


# ─── ICEGATE manifest lookup ────────────────────────────────────────

async def icegate_manifest(request: Request):
    """GET /icegate/manifest/{bill_no} — fetch manifest via ICEGATE bridge."""
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    bill_no = request.path_params["bill_no"]
    year = request.query_params.get("year", "2026")

    bridge = ICEGATEBridge()
    manifest = await bridge.fetch_manifest(bill_no, year)
    return JSONResponse(manifest)


# ─── Sanctions check ────────────────────────────────────────────────

async def sanctions_check(request: Request):
    """POST /sanctions/check — check entity against OFAC/UN/INTERPOL."""
    try:
        _auth(request)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    payload = await request.json()
    entity_type = payload.get("entity_type", "name")
    entity_value = payload.get("entity_value", "")

    feed = MHASanctionsFeed()
    result = await feed.check_entity(entity_type, entity_value)
    return JSONResponse(result)


# ─── WebSocket: live stats stream ────────────────────────────────────

_ws_clients: set = set()


async def ws_stats(websocket: WebSocket):
    """WebSocket /ws/stats — push live dashboard stats every 5 seconds."""
    await websocket.accept()
    _ws_clients.add(websocket)
    try:
        while True:
            stats = await _compute_stats()
            await websocket.send_json(stats)
            await asyncio.sleep(5)
    except Exception:
        pass
    finally:
        _ws_clients.discard(websocket)


# ─── Application ─────────────────────────────────────────────────────

app = Starlette(
    routes=[
        # Core
        Route("/health", health, methods=["GET"]),
        Route("/clearance/initiate", clearance_initiate, methods=["POST"]),
        Route("/clearance/{clearance_id}/result", clearance_result_handler, methods=["GET"]),
        Route("/officer/override", officer_override_handler, methods=["POST"]),
        # Dashboard
        Route("/dashboard/stats", dashboard_stats, methods=["GET"]),
        # Blockchain / identity
        Route("/blockchain/importer/register", blockchain_register_importer, methods=["POST"]),
        Route("/blockchain/importer/{gstin}/profile", blockchain_importer_profile, methods=["GET"]),
        # ICEGATE bridge
        Route("/icegate/manifest/{bill_no}", icegate_manifest, methods=["GET"]),
        # Sanctions
        Route("/sanctions/check", sanctions_check, methods=["POST"]),
        # WebSocket
        WebSocketRoute("/ws/stats", ws_stats),
    ]
)
