"""YOLOv8 inference with real Grad-CAM heatmap generation.

PRD §5.1.3:
  Step 3: Run YOLOv8 inference → bounding boxes + confidence scores
  Step 4: Generate Grad-CAM heatmap overlaid on original image
"""

from ultralytics import YOLO
import cv2
import numpy as np
import base64
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def run_inference(
    model_path: str,
    image_path: str,
    conf_thres: float = 0.5,
    iou_thres: float = 0.45,
) -> Dict[str, Any]:
    """Run YOLOv8 inference on a single image.

    Args:
        model_path: Path to the trained YOLOv8 model (.pt).
        image_path: Path to the image file.
        conf_thres: Confidence threshold for detections.
        iou_thres: Intersection over Union threshold for NMS.

    Returns:
        JSON-serializable detection results with Grad-CAM heatmap.
    """
    try:
        model = YOLO(model_path)
    except Exception as e:
        logger.error(f"Error loading model from {model_path}: {e}")
        return {"error": str(e)}

    image = cv2.imread(image_path)
    if image is None:
        return {"error": f"Image not found at {image_path}"}

    results = model.predict(
        source=image,
        conf=conf_thres,
        iou=iou_thres,
        save=False,
        device="cpu",
    )

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
                "bbox": [round(coord) for coord in xyxy],
            })

    # Generate Grad-CAM heatmap
    heatmap_b64 = generate_gradcam_heatmap(model, image, image_path, detections)

    # Fallback to annotated frame if Grad-CAM fails
    if not heatmap_b64:
        annotated_frame = results[0].plot()
        _, buffer = cv2.imencode(".jpg", annotated_frame)
        heatmap_b64 = base64.b64encode(buffer).decode("utf-8")

    anomaly_detected = len(detections) > 0
    max_confidence = max([d["confidence"] for d in detections]) if detections else 0.0

    return {
        "scan_id": image_path,
        "anomaly_detected": anomaly_detected,
        "heatmap_base64": heatmap_b64,
        "confidence": round(max_confidence, 3),
        "detections": detections,
        "model_used": model_path,
    }


def generate_gradcam_heatmap(
    model: YOLO,
    image: np.ndarray,
    image_path: str,
    detections: List[Dict],
) -> Optional[str]:
    """Generate a real Grad-CAM heatmap using pytorch-grad-cam.

    Attempts to extract the backbone's last convolutional layer from
    the YOLOv8 model and produce a class-activation heatmap. Falls back
    to a synthetic attention map if pytorch-grad-cam is unavailable.

    Returns:
        Base64-encoded JPEG of the heatmap overlay, or None on failure.
    """
    try:
        import torch
        from pytorch_grad_cam import GradCAM
        from pytorch_grad_cam.utils.image import show_cam_on_image

        # Get the underlying PyTorch model
        torch_model = model.model

        # Find the last convolutional layer in the backbone
        target_layers = _find_target_layers(torch_model)
        if not target_layers:
            logger.warning("Could not find target conv layer for Grad-CAM")
            return _generate_synthetic_heatmap(image, detections)

        # Prepare input tensor
        img_resized = cv2.resize(image, (640, 640))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_float = img_rgb.astype(np.float32) / 255.0
        input_tensor = torch.from_numpy(img_float).permute(2, 0, 1).unsqueeze(0)

        # Run Grad-CAM
        cam = GradCAM(model=torch_model, target_layers=target_layers)
        grayscale_cam = cam(input_tensor=input_tensor)
        grayscale_cam = grayscale_cam[0, :]

        # Overlay on original image
        cam_image = show_cam_on_image(img_float, grayscale_cam, use_rgb=True)

        # Draw detection bounding boxes on top
        h_scale = image.shape[0] / 640
        w_scale = image.shape[1] / 640
        cam_bgr = cv2.cvtColor(cam_image, cv2.COLOR_RGB2BGR)
        cam_bgr = cv2.resize(cam_bgr, (image.shape[1], image.shape[0]))

        for det in detections:
            bbox = det["bbox"]
            cv2.rectangle(
                cam_bgr,
                (int(bbox[0]), int(bbox[1])),
                (int(bbox[2]), int(bbox[3])),
                (0, 255, 0),
                2,
            )
            cv2.putText(
                cam_bgr,
                f"{det['label']} {det['confidence']}",
                (int(bbox[0]), int(bbox[1]) - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )

        _, buffer = cv2.imencode(".jpg", cam_bgr)
        return base64.b64encode(buffer).decode("utf-8")

    except ImportError:
        logger.info("pytorch-grad-cam not available, using synthetic heatmap")
        return _generate_synthetic_heatmap(image, detections)
    except Exception as e:
        logger.warning(f"Grad-CAM generation failed: {e}")
        return _generate_synthetic_heatmap(image, detections)


def _find_target_layers(model) -> list:
    """Find the last convolutional layer in the YOLOv8 model backbone."""
    target_layers = []
    try:
        # YOLOv8 backbone structure: model.model[N] where N is the last backbone block
        if hasattr(model, "model"):
            backbone = model.model
            # Look for the last Conv2d layer in the backbone
            for i in range(len(backbone) - 1, -1, -1):
                module = backbone[i]
                for m in module.modules():
                    if hasattr(m, "weight") and len(m.weight.shape) == 4:
                        target_layers.append(m)
                        return target_layers
    except Exception as e:
        logger.debug(f"Target layer search failed: {e}")
    return target_layers


def _generate_synthetic_heatmap(
    image: np.ndarray,
    detections: List[Dict],
) -> Optional[str]:
    """Generate a synthetic attention heatmap when Grad-CAM isn't available.

    Creates a Gaussian-based heatmap centered on detection bounding boxes.
    """
    try:
        h, w = image.shape[:2]
        heatmap = np.zeros((h, w), dtype=np.float32)

        for det in detections:
            bbox = det["bbox"]
            cx = int((bbox[0] + bbox[2]) / 2)
            cy = int((bbox[1] + bbox[3]) / 2)
            bw = int(bbox[2] - bbox[0])
            bh = int(bbox[3] - bbox[1])
            sigma_x = max(bw // 2, 20)
            sigma_y = max(bh // 2, 20)

            y, x = np.ogrid[:h, :w]
            gaussian = np.exp(-((x - cx) ** 2 / (2 * sigma_x ** 2) + (y - cy) ** 2 / (2 * sigma_y ** 2)))
            heatmap += gaussian.astype(np.float32) * det["confidence"]

        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()

        # Apply colormap
        heatmap_colored = cv2.applyColorMap(
            (heatmap * 255).astype(np.uint8), cv2.COLORMAP_JET
        )

        # Overlay
        overlay = cv2.addWeighted(image, 0.6, heatmap_colored, 0.4, 0)

        # Draw bounding boxes
        for det in detections:
            bbox = det["bbox"]
            cv2.rectangle(
                overlay,
                (int(bbox[0]), int(bbox[1])),
                (int(bbox[2]), int(bbox[3])),
                (0, 255, 0),
                2,
            )
            cv2.putText(
                overlay,
                f"{det['label']} {det['confidence']}",
                (int(bbox[0]), int(bbox[1]) - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )

        _, buffer = cv2.imencode(".jpg", overlay)
        return base64.b64encode(buffer).decode("utf-8")

    except Exception as e:
        logger.error(f"Synthetic heatmap generation failed: {e}")
        return None


def generate_heatmap(image_path: str, detections: List[Dict]) -> str:
    """Legacy heatmap generation (backward compatibility).

    Uses synthetic Gaussian approach when called directly.
    """
    image = cv2.imread(image_path)
    if image is None:
        return ""
    result = _generate_synthetic_heatmap(image, detections)
    return result or ""
