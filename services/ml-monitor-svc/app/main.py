"""ML Monitor Service — drift detection, A/B testing, model registry.

PRD §Phase 5:
  - Evidently-style drift detection on vision + risk model inputs
  - A/B test traffic splitting and auto-promotion
  - MLflow model registry (version tagging, never delete old versions)
"""

import logging
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.monitor.drift import detect_drift, set_baseline
from app.ab_test.ab_test import ab_compare, start_ab_test, stop_ab_test, record_result
from app.mlflow.registry import (
    register_model,
    promote_model,
    list_models,
    get_production_model,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def health(request):
    return JSONResponse({"status": "ok", "service": "ml-monitor-svc"})


# ------------------------------------------------------------------
# Drift Detection
# ------------------------------------------------------------------

async def drift_report(request):
    """GET /drift — run drift detection and return report."""
    report = detect_drift()
    return JSONResponse(report)


async def drift_baseline(request: Request):
    """POST /drift/baseline — set baseline feature distributions."""
    payload = await request.json()
    result = set_baseline(payload.get("features", {}))
    return JSONResponse(result)


async def drift_check(request: Request):
    """POST /drift/check — check drift against provided recent data."""
    payload = await request.json()
    report = detect_drift(recent_features=payload.get("features"))
    return JSONResponse(report)


# ------------------------------------------------------------------
# A/B Testing
# ------------------------------------------------------------------

async def ab_report(request):
    """GET /ab — get current A/B test comparison."""
    report = ab_compare()
    return JSONResponse(report)


async def ab_start(request: Request):
    """POST /ab/start — start a new A/B test."""
    payload = await request.json()
    result = start_ab_test(
        model_a_version=payload.get("model_a", "v1.0.0"),
        model_b_version=payload.get("model_b", "v1.1.0"),
        traffic_split=payload.get("traffic_split", 10),
    )
    return JSONResponse(result)


async def ab_stop(request: Request):
    """POST /ab/stop — stop the current A/B test."""
    result = stop_ab_test()
    return JSONResponse(result)


async def ab_record(request: Request):
    """POST /ab/record — record a prediction result for A/B comparison."""
    payload = await request.json()
    record_result(
        model=payload.get("model", "a"),
        predicted_lane=payload.get("predicted"),
        actual_lane=payload.get("actual"),
    )
    return JSONResponse({"status": "recorded"})


# ------------------------------------------------------------------
# Model Registry
# ------------------------------------------------------------------

async def registry_list(request: Request):
    """GET /registry — list all registered models."""
    name = request.query_params.get("name")
    models = list_models(name)
    return JSONResponse({"models": models})


async def registry_register(request: Request):
    """POST /registry — register a new model version."""
    payload = await request.json()
    result = register_model(
        name=payload.get("name"),
        version=payload.get("version"),
        metrics=payload.get("metrics"),
        stage=payload.get("stage", "Staging"),
    )
    return JSONResponse(result)


async def registry_promote(request: Request):
    """POST /registry/promote — promote model to Production."""
    payload = await request.json()
    result = promote_model(
        name=payload.get("name"),
        version=payload.get("version"),
        to_stage=payload.get("stage", "Production"),
    )
    return JSONResponse(result)


async def registry_production(request: Request):
    """GET /registry/production/{name} — get current production model."""
    name = request.path_params["name"]
    model = get_production_model(name)
    if model:
        return JSONResponse(model)
    return JSONResponse({"error": f"No production model for {name}"}, status_code=404)


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        # Drift
        Route("/drift", drift_report, methods=["GET"]),
        Route("/drift/baseline", drift_baseline, methods=["POST"]),
        Route("/drift/check", drift_check, methods=["POST"]),
        # A/B Testing
        Route("/ab", ab_report, methods=["GET"]),
        Route("/ab/start", ab_start, methods=["POST"]),
        Route("/ab/stop", ab_stop, methods=["POST"]),
        Route("/ab/record", ab_record, methods=["POST"]),
        # Registry
        Route("/registry", registry_list, methods=["GET"]),
        Route("/registry", registry_register, methods=["POST"]),
        Route("/registry/promote", registry_promote, methods=["POST"]),
        Route("/registry/production/{name}", registry_production, methods=["GET"]),
    ]
)
