from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.model.inference import run_inference
from app.preprocess.xray_pipeline import preprocess_scan


async def health(request: Request):
    return JSONResponse({"status": "ok"})


async def scan(request: Request):
    payload = await request.json()
    scan_id = payload.get("scan_id")
    if not scan_id:
        raise HTTPException(status_code=422, detail="scan_id is required")
    dicom_url = payload.get("dicom_url", "")
    preprocessed = preprocess_scan(scan_id, dicom_url)
    result = run_inference(preprocessed, payload)
    return JSONResponse(result)


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/scan", scan, methods=["POST"]),
    ]
)
