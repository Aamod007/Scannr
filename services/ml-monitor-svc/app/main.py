from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.monitor.drift import detect_drift
from app.ab_test.ab_test import ab_compare


async def health(request):
    return JSONResponse({"status": "ok"})


async def drift_report(request):
    report = detect_drift()
    return JSONResponse(report)


async def ab_report(request):
    report = ab_compare()
    return JSONResponse(report)


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/drift", drift_report, methods=["GET"]),
        Route("/ab", ab_report, methods=["GET"]),
    ]
)
