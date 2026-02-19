from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import shutil
import os
import uuid
import logging
from typing import Optional

from app.model.inference import run_inference
from app.preprocess.xray_pipeline import preprocess_xray
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SCANNR Vision AI Service",
    description="YOLOv8-based X-ray analysis for customs clearance",
    version="1.0.0"
)

MODEL_PATH = os.getenv("MODEL_PATH", "runs/detect/scannr_vision_model/weights/best.pt")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ScanPayload(BaseModel):
    scan_id: str
    dicom_url: Optional[str] = None
    simulate_anomaly: bool = False
    confidence: float = 0.05
    anomaly_class: str = "density_anomaly"


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "ok", "service": "vision-svc"}

@app.post("/scan")
async def scan_image(payload: ScanPayload):
    """
    Upload an X-ray image for analysis.
    """
    if payload.simulate_anomaly:
        detection = {
            "label": payload.anomaly_class,
            "confidence": round(float(max(payload.confidence, 0.85)), 3),
            "bbox": [120, 140, 320, 360],
        }
        return JSONResponse(
            content={
                "scan_id": payload.scan_id,
                "anomaly_detected": True,
                "heatmap_url": "https://storage.scannr.in/heatmaps/demo.png",
                "confidence": detection["confidence"],
                "detections": [detection],
            }
        )

    return JSONResponse(
        content={
            "scan_id": payload.scan_id,
            "anomaly_detected": False,
            "heatmap_url": "https://storage.scannr.in/heatmaps/demo.png",
            "confidence": round(float(payload.confidence), 3),
            "detections": [],
        }
    )


@app.post("/scan/file")
async def scan_image_file(file: UploadFile = File(...)):
    """
    Upload an X-ray image for analysis.
    """
    try:
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Received scan request for {filename}")

        try:
            import cv2
            processed_image = preprocess_xray(file_path)
            cv2.imwrite(file_path, processed_image)
            logger.info(f"Preprocessing successful for {filename}")
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")

        model_to_use = MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Custom model not found at {MODEL_PATH}. Using standard yolov8n.pt for demonstration.")
            model_to_use = "yolov8n.pt"

        result = run_inference(
            model_path=model_to_use,
            image_path=file_path,
            conf_thres=0.25
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
