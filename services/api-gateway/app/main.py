from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.orchestrator.clearance import initiate_clearance
from app.orchestrator.override import officer_override
from app.orchestrator.result import clearance_result
from app.middleware.auth import check_jwt


async def health(request):
    return JSONResponse({"status": "ok"})


async def clearance_initiate(request: Request):
    auth_header = request.headers.get("Authorization")
    try:
        check_jwt(auth_header)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    payload = await request.json()
    result = await initiate_clearance(payload)
    return JSONResponse(result)


async def clearance_result_handler(request: Request):
    auth_header = request.headers.get("Authorization")
    try:
        check_jwt(auth_header)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    clearance_id = request.path_params["clearance_id"]
    result = await clearance_result(clearance_id)
    return JSONResponse(result)


async def officer_override_handler(request: Request):
    auth_header = request.headers.get("Authorization")
    try:
        check_jwt(auth_header)
    except Exception:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    payload = await request.json()
    result = await officer_override(payload)
    return JSONResponse(result)


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/clearance/initiate", clearance_initiate, methods=["POST"]),
        Route("/clearance/{clearance_id}/result", clearance_result_handler, methods=["GET"]),
        Route("/officer/override", officer_override_handler, methods=["POST"]),
    ]
)