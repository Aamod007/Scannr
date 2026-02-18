from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.features.assemble import assemble_features
from app.model.predict import predict_risk


async def health(request):
    return JSONResponse({"status": "ok"})


async def score(request: Request):
    payload = await request.json()
    features = assemble_features(payload)
    result = predict_risk(features)
    return JSONResponse(result)


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/score", score, methods=["POST"]),
    ]
)
