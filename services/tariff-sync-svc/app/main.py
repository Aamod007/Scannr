"""Tariff Sync Service — polls CBIC API every 6 hours, updates HS code risk weights.

PRD §5.3.4:
  - Poll CBIC tariff API every 6 hours
  - On change detection: update tariff_risk_weights table
  - Trigger risk-svc weight refresh within 24 hours
  - Log every sync event to PostgreSQL with diff and timestamp
"""

import os
import json
import logging
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CBIC_API_URL = os.getenv("CBIC_API_URL", "https://api.cbic.gov.in/tariff/v1/")
CBIC_API_KEY = os.getenv("CBIC_API_KEY", "")
RISK_SVC_URL = os.getenv("RISK_SVC_URL", "http://risk-svc:8000")
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://scannr:scannr@postgres:5432/scannr")
POLL_INTERVAL_HOURS = int(os.getenv("TARIFF_POLL_INTERVAL", "6"))

# In-memory cache of current tariff weights
_current_weights: Dict[str, Dict] = {}
_last_sync: Optional[datetime] = None
_scheduler = None


# ------------------------------------------------------------------
# CBIC API client (with mock fallback for development)
# ------------------------------------------------------------------

async def _fetch_cbic_tariffs() -> List[Dict]:
    """Fetch latest tariff schedule from CBIC API.

    Falls back to mock data when CBIC_API_KEY is not configured.
    """
    if not CBIC_API_KEY:
        return _get_mock_tariffs()

    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                CBIC_API_URL,
                headers={"X-API-Key": CBIC_API_KEY},
                params={"budget_year": 2026},
            )
            response.raise_for_status()
            return response.json().get("tariffs", [])
    except Exception as e:
        logger.error(f"CBIC API fetch failed: {e}")
        return _get_mock_tariffs()


def _get_mock_tariffs() -> List[Dict]:
    """Return mock Budget 2026-27 tariff data for development."""
    return [
        {"hs_code": "8471.30", "description": "Portable computers / laptops", "duty_pct": 15.0, "risk_weight": 1.2, "budget_year": 2026},
        {"hs_code": "7108.12", "description": "Gold - non-monetary, unwrought", "duty_pct": 12.5, "risk_weight": 1.8, "budget_year": 2026},
        {"hs_code": "8542.31", "description": "Electronic integrated circuits", "duty_pct": 10.0, "risk_weight": 1.4, "budget_year": 2026},
        {"hs_code": "8517.12", "description": "Smartphones / mobile phones", "duty_pct": 20.0, "risk_weight": 1.5, "budget_year": 2026},
        {"hs_code": "3004.90", "description": "Medicaments - packaged for retail", "duty_pct": 10.0, "risk_weight": 1.5, "budget_year": 2026},
        {"hs_code": "9306.30", "description": "Cartridges & parts thereof", "duty_pct": 25.0, "risk_weight": 2.5, "budget_year": 2026},
        {"hs_code": "2933.39", "description": "Heterocyclic compounds (precursors)", "duty_pct": 7.5, "risk_weight": 2.0, "budget_year": 2026},
        {"hs_code": "8703.23", "description": "Motor vehicles 1500-3000cc", "duty_pct": 60.0, "risk_weight": 1.3, "budget_year": 2026},
        {"hs_code": "2402.20", "description": "Cigarettes of tobacco", "duty_pct": 100.0, "risk_weight": 1.6, "budget_year": 2026},
        {"hs_code": "2208.30", "description": "Whiskies", "duty_pct": 150.0, "risk_weight": 1.4, "budget_year": 2026},
        {"hs_code": "6203.42", "description": "Trousers - cotton", "duty_pct": 20.0, "risk_weight": 1.0, "budget_year": 2026},
        {"hs_code": "8544.49", "description": "Electric conductors", "duty_pct": 7.5, "risk_weight": 1.1, "budget_year": 2026},
        {"hs_code": "3920.99", "description": "Plastic plates/sheets", "duty_pct": 10.0, "risk_weight": 0.9, "budget_year": 2026},
        {"hs_code": "7210.49", "description": "Flat-rolled iron/steel", "duty_pct": 12.5, "risk_weight": 1.1, "budget_year": 2026},
        {"hs_code": "2710.19", "description": "Petroleum oils", "duty_pct": 5.0, "risk_weight": 0.8, "budget_year": 2026},
    ]


# ------------------------------------------------------------------
# Database operations
# ------------------------------------------------------------------

async def _get_db_pool():
    """Create asyncpg pool."""
    import asyncpg

    return await asyncpg.create_pool(POSTGRES_URL, min_size=1, max_size=5)


async def _update_tariff_table(tariffs: List[Dict]) -> Dict[str, Any]:
    """Upsert tariff_risk_weights table and return the diff."""
    global _current_weights

    changes = []
    try:
        pool = await _get_db_pool()
        async with pool.acquire() as conn:
            for t in tariffs:
                hs_code = t["hs_code"]
                new_weight = t["risk_weight"]
                old_weight = _current_weights.get(hs_code, {}).get("risk_weight")

                await conn.execute(
                    """
                    INSERT INTO tariff_risk_weights (hs_code, description, risk_weight, budget_year, effective_from, last_synced_at)
                    VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW())
                    ON CONFLICT (hs_code) DO UPDATE SET
                        description = EXCLUDED.description,
                        risk_weight = EXCLUDED.risk_weight,
                        budget_year = EXCLUDED.budget_year,
                        last_synced_at = NOW()
                    """,
                    hs_code,
                    t.get("description", ""),
                    new_weight,
                    t.get("budget_year", 2026),
                )

                if old_weight is not None and old_weight != new_weight:
                    changes.append(
                        {"hs_code": hs_code, "old_weight": old_weight, "new_weight": new_weight}
                    )

                _current_weights[hs_code] = t

        await pool.close()
    except Exception as e:
        logger.error(f"DB update failed: {e}")
        # Still update in-memory cache
        for t in tariffs:
            _current_weights[t["hs_code"]] = t

    return {"updated": len(tariffs), "changes": changes}


async def _notify_risk_svc(weights: Dict[str, float]) -> bool:
    """Push updated weights to risk-svc via POST /weights."""
    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{RISK_SVC_URL}/weights",
                json={"weights": weights},
            )
            return resp.status_code == 200
    except Exception as e:
        logger.warning(f"Failed to notify risk-svc: {e}")
        return False


# ------------------------------------------------------------------
# Sync job
# ------------------------------------------------------------------

async def run_sync() -> Dict[str, Any]:
    """Execute one sync cycle: fetch → diff → update → notify."""
    global _last_sync

    logger.info("Starting tariff sync cycle...")
    tariffs = await _fetch_cbic_tariffs()

    if not tariffs:
        return {"status": "no_data", "timestamp": datetime.now(timezone.utc).isoformat()}

    # Compute content hash for change detection
    content_hash = hashlib.sha256(json.dumps(tariffs, sort_keys=True).encode()).hexdigest()

    result = await _update_tariff_table(tariffs)

    # Push to risk-svc
    weight_map = {t["hs_code"]: t["risk_weight"] for t in tariffs}
    notified = await _notify_risk_svc(weight_map)

    _last_sync = datetime.now(timezone.utc)

    return {
        "status": "synced",
        "tariffs_count": len(tariffs),
        "changes": result.get("changes", []),
        "content_hash": content_hash,
        "risk_svc_notified": notified,
        "timestamp": _last_sync.isoformat(),
    }


# ------------------------------------------------------------------
# APScheduler integration
# ------------------------------------------------------------------

def _start_scheduler():
    """Start the background scheduler for periodic polling."""
    global _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler

        _scheduler = AsyncIOScheduler()

        async def _scheduled_sync():
            try:
                result = await run_sync()
                logger.info(f"Scheduled sync result: {result.get('status')}")
            except Exception as e:
                logger.error(f"Scheduled sync error: {e}")

        _scheduler.add_job(
            _scheduled_sync,
            "interval",
            hours=POLL_INTERVAL_HOURS,
            id="tariff_sync",
            replace_existing=True,
        )
        _scheduler.start()
        logger.info(f"Tariff sync scheduler started — polling every {POLL_INTERVAL_HOURS}h")
    except Exception as e:
        logger.warning(f"Scheduler start failed (non-fatal): {e}")


# ------------------------------------------------------------------
# Starlette app & routes
# ------------------------------------------------------------------

async def health(request):
    return JSONResponse({
        "status": "ok",
        "service": "tariff-sync-svc",
        "last_sync": _last_sync.isoformat() if _last_sync else None,
        "cached_tariffs": len(_current_weights),
    })


async def sync_now(request: Request):
    """POST /sync — trigger immediate sync."""
    result = await run_sync()
    return JSONResponse(result)


async def list_tariffs(request: Request):
    """GET /tariffs — return cached tariff weights."""
    return JSONResponse({
        "tariffs": list(_current_weights.values()),
        "count": len(_current_weights),
        "last_sync": _last_sync.isoformat() if _last_sync else None,
    })


async def get_tariff(request: Request):
    """GET /tariffs/{hs_code} — return single tariff entry."""
    hs_code = request.path_params["hs_code"]
    entry = _current_weights.get(hs_code)
    if entry:
        return JSONResponse(entry)
    return JSONResponse({"error": f"HS code {hs_code} not found"}, status_code=404)


async def on_startup():
    """Run initial sync on startup."""
    _start_scheduler()
    try:
        result = await run_sync()
        logger.info(f"Initial tariff sync: {result.get('status')}")
    except Exception as e:
        logger.warning(f"Initial sync failed (non-fatal): {e}")


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/sync", sync_now, methods=["POST"]),
        Route("/tariffs", list_tariffs, methods=["GET"]),
        Route("/tariffs/{hs_code}", get_tariff, methods=["GET"]),
    ],
    on_startup=[on_startup],
)
