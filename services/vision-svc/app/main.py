from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import shutil
import os
import uuid
import logging

# Import our new modules
from app.model.inference import run_inference
from app.preprocess.xray_pipeline import preprocess_xray

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SCANNR Vision AI Service",
    description="YOLOv8-based X-ray analysis for customs clearance",
    version="1.0.0"
)

# Configuration
MODEL_PATH = os.getenv("MODEL_PATH", "runs/detect/scannr_vision_model/weights/best.pt")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "ok", "service": "vision-svc"}

@app.post("/scan")
async def scan_image(file: UploadFile = File(...)):
    """
    Upload an X-ray image for analysis.

    Args:
        file (UploadFile): The image file (PNG, JPG, DICOM).

    Returns:
        JSON: Detection results including bounding boxes, confidence scores, and heatmap URL.
    """
    try:
        # Generate unique filename
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Received scan request for {filename}")

        # Preprocess image (optional but good practice)
        try:
            import cv2
            processed_image = preprocess_xray(file_path)
            # Overwrite the original file with the preprocessed version
            cv2.imwrite(file_path, processed_image)
            logger.info(f"Preprocessing successful for {filename}")
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            # Continue with original image if preprocessing fails, or raise error

        # Run inference
        # Check if model exists, if not use a pretrained YOLOv8 model for demo purposes
        model_to_use = MODEL_PATH
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Custom model not found at {MODEL_PATH}. Using standard yolov8n.pt for demonstration.")
            model_to_use = "yolov8n.pt" # Fallback to standard model

        result = run_inference(
            model_path=model_to_use,
            image_path=file_path,
            conf_thres=0.25
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Clean up uploaded file (optional, or move to permanent storage)
        # os.remove(file_path)

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
