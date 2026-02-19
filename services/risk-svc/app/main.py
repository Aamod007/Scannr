"""Risk Scoring Service — FastAPI-style app (Starlette)."""

import logging
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.features.assemble import assemble_features, update_hs_risk_weights
from app.model.predict import predict_risk
from app.model.train import train_model
from app.model.evaluate import evaluate_model
from app.retrain.scheduler import should_retrain, run_retrain_job, detect_adversarial_spike

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def health(request):
    return JSONResponse({"status": "ok", "service": "risk-svc"})


async def score(request: Request):
    """POST /score — compute risk lane decision."""
    payload = await request.json()
    features = assemble_features(payload)
    result = predict_risk(features)
    return JSONResponse(result)


async def train(request: Request):
    """POST /train — trigger XGBoost model training."""
    payload = await request.json() if request.headers.get("content-length", "0") != "0" else {}
    result = train_model(payload)
    return JSONResponse(result)


async def evaluate(request: Request):
    """GET /evaluate — evaluate current model on test set."""
    result = evaluate_model()
    return JSONResponse(result)


async def retrain(request: Request):
    """POST /retrain — trigger self-healing retrain if threshold met."""
    payload = await request.json() if request.headers.get("content-length", "0") != "0" else {}
    queue_count = payload.get("queue_count", 50)
    force = payload.get("force", False)
    result = run_retrain_job(queue_count=queue_count, force=force)
    return JSONResponse(result)


async def spike_check(request: Request):
    """POST /spike — check for adversarial class spikes."""
    payload = await request.json()
    result = detect_adversarial_spike(
        recent_class_counts=payload.get("recent", {}),
        baseline_class_counts=payload.get("baseline", {}),
    )
    return JSONResponse(result)


async def update_weights(request: Request):
    """POST /weights — hot-reload HS code risk weights from tariff-sync-svc."""
    payload = await request.json()
    update_hs_risk_weights(payload.get("weights", {}))
    return JSONResponse({"status": "updated", "count": len(payload.get("weights", {}))})


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/score", score, methods=["POST"]),
        Route("/train", train, methods=["POST"]),
        Route("/evaluate", evaluate, methods=["GET"]),
        Route("/retrain", retrain, methods=["POST"]),
        Route("/spike", spike_check, methods=["POST"]),
        Route("/weights", update_weights, methods=["POST"]),
    ]
)
