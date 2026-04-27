from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn
import logging
from datetime import datetime

from inference.detector import ThreatDetector
from utils.storage import S3Storage
from utils.logger import setup_logger

# Initialize FastAPI
app = FastAPI(
    title="SCANNR Computer Vision Service",
    description="X-ray threat detection using YOLOv8",
    version="2.3.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
detector = ThreatDetector()
storage = S3Storage()
logger = setup_logger(__name__)

# Request/Response models
class AnalyzeRequest(BaseModel):
    container_id: str = Field(..., example="TCMU-2026-00147")
    image_path: str = Field(..., example="s3://xray-scans/2026/02/05/TCMU-2026-00147.jpg")

class Detection(BaseModel):
    class_name: str = Field(..., example="anomaly")
    confidence: float = Field(..., ge=0.0, le=1.0, example=0.87)
    bounding_box: List[int] = Field(..., example=[145, 220, 180, 210])
    description: str = Field(..., example="Density irregularity detected")

class AnalyzeResponse(BaseModel):
    container_id: str
    scan_timestamp: str
    processing_time_ms: int
    model_version: str
    detections: List[Detection]
    overall_risk_flag: str  # "clear", "review_recommended", "critical"
    gradcam_url: Optional[str]
    similar_cases: List[str]

@app.on_event("startup")
async def startup_event():
    """Load ML model on startup"""
    logger.info("Loading YOLOv8 model...")
    await detector.load_model()
    logger.info("Computer Vision service ready")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": detector.is_loaded(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/cv/analyze", response_model=AnalyzeResponse)
async def analyze_scan(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks
):
    """
    Analyze X-ray scan for threats
  
    This endpoint:
    1. Downloads image from S3
    2. Preprocesses image
    3. Runs YOLOv8 inference
    4. Generates Grad-CAM heatmap
    5. Returns detections with confidence scores
    """
    start_time = datetime.utcnow()
  
    try:
        logger.info(f"Analyzing container {request.container_id}")
      
        # Download image from S3
        logger.debug(f"Downloading image from {request.image_path}")
        image_data = await storage.download(request.image_path)
      
        # Run detection
        detections, gradcam_path = await detector.detect(
            image_data,
            container_id=request.container_id
        )
      
        # Calculate processing time
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
      
        # Determine overall risk flag
        risk_flag = _calculate_risk_flag(detections)
      
        # Find similar historical cases (background task)
        similar_cases = []
        if detections:
            background_tasks.add_task(_find_similar_cases, request.container_id, detections)
      
        # Save results to database (background task)
        background_tasks.add_task(_save_results, request.container_id, detections, processing_time)
      
        logger.info(
            f"Analysis complete for {request.container_id}: "
            f"{len(detections)} detections, risk={risk_flag}, time={processing_time}ms"
        )
      
        return AnalyzeResponse(
            container_id=request.container_id,
            scan_timestamp=start_time.isoformat(),
            processing_time_ms=processing_time,
            model_version="yolov8x-customs-v2.3",
            detections=[
                Detection(
                    class_name=d['class'],
                    confidence=d['confidence'],
                    bounding_box=d['bbox'],
                    description=d['description']
                ) for d in detections
            ],
            overall_risk_flag=risk_flag,
            gradcam_url=f"s3://gradcam-maps/{gradcam_path}" if gradcam_path else None,
            similar_cases=similar_cases
        )
      
    except Exception as e:
        logger.error(f"Error analyzing {request.container_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

def _calculate_risk_flag(detections: List[dict]) -> str:
    """Determine overall risk flag based on detections"""
    if not detections:
        return "clear"
  
    # Critical threats
    critical_classes = {'weapon', 'narcotic'}
    if any(d['class'] in critical_classes and d['confidence'] > 0.85 for d in detections):
        return "critical"
  
    # Review recommended
    review_classes = {'contraband', 'anomaly'}
    if any(d['class'] in review_classes and d['confidence'] > 0.70 for d in detections):
        return "review_recommended"
  
    return "clear"

async def _find_similar_cases(container_id: str, detections: List[dict]):
    """Find similar historical cases (runs in background)"""
    # TODO: Implement similarity search using vector embeddings
    pass

async def _save_results(container_id: str, detections: List[dict], processing_time: int):
    """Save results to PostgreSQL (runs in background)"""
    # TODO: Implement database insert
    pass

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,  # Disable in production
        log_level="info"
    )
