from ultralytics import YOLO
import cv2
import numpy as np
import base64
import requests
from io import BytesIO
from typing import Dict, Any, List

def run_inference(
    model_path: str,
    image_path: str,
    conf_thres: float = 0.5,
    iou_thres: float = 0.45
) -> Dict[str, Any]:
    """
    Run YOLOv8 inference on a single image.

    Args:
        model_path (str): Path to the trained YOLOv8 model (.pt).
        image_path (str): Path to the image file.
        conf_thres (float): Confidence threshold for detections.
        iou_thres (float): Intersection over Union threshold for NMS.

    Returns:
        Dict: JSON-serializable detection results.
    """

    # Load model
    try:
        model = YOLO(model_path)
    except Exception as e:
        print(f"Error loading model from {model_path}: {e}")
        return {"error": str(e)}

    # Read image
    image = cv2.imread(image_path)
    if image is None:
        return {"error": f"Image not found at {image_path}"}

    # Preprocess (optional if model handles it, but let's be explicit)
    # Note: YOLOv8 handles resizing internally, but we might want to ensure consistent size
    # resized_image = cv2.resize(image, (640, 640))

    # Run inference
    results = model.predict(
        source=image,
        conf=conf_thres,
        iou=iou_thres,
        save=False,  # Don't save image to disk automatically
        device='cpu' # Use CPU for now, change to '0' for GPU if available
    )

    # Process results
    detections = []

    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            label = result.names[cls_id]

            detections.append({
                "label": label,
                "confidence": round(conf, 3),
                "bbox": [round(coord) for coord in xyxy]
            })

    # Generate Grad-CAM Heatmap (simplified for YOLOv8 - using overlay of boxes for now as true Grad-CAM requires gradient access which is complex in standard inference mode)
    # For a true Grad-CAM implementation, we would need hooks into the model layers.
    # As a placeholder for visualization, let's draw bounding boxes on a copy of the image.
    annotated_frame = results[0].plot()

    # Encode annotated image to base64 for returning in API (or saving to S3)
    _, buffer = cv2.imencode('.jpg', annotated_frame)
    heatmap_b64 = base64.b64encode(buffer).decode('utf-8')

    # Determine anomaly status based on detections
    anomaly_detected = len(detections) > 0
    max_confidence = max([d['confidence'] for d in detections]) if detections else 0.0

    return {
        "scan_id": image_path, # Using path as ID for simplicity
        "anomaly_detected": anomaly_detected,
        "heatmap_base64": heatmap_b64, # In production, upload to S3 and return URL
        "confidence": round(max_confidence, 3),
        "detections": detections,
        "model_used": model_path
    }

def generate_heatmap(image_path: str, detections: List[Dict]) -> str:
    """
    Generate a heatmap visualization.
    In a real scenario, this would use Grad-CAM.
    For now, it overlays bounding boxes.
    """
    image = cv2.imread(image_path)
    if image is None:
        return ""

    for det in detections:
        bbox = det['bbox']
        cv2.rectangle(image, (int(bbox[0]), int(bbox[1])), (int(bbox[2]), int(bbox[3])), (0, 0, 255), 2)
        cv2.putText(image, f"{det['label']} {det['confidence']}", (int(bbox[0]), int(bbox[1]-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

    _, buffer = cv2.imencode('.jpg', image)
    return base64.b64encode(buffer).decode('utf-8')
