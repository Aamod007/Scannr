import torch
import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Tuple, Optional
import logging
from pathlib import Path

from explainability.gradcam import GradCAMGenerator
from utils.storage import S3Storage

logger = logging.getLogger(__name__)

class ThreatDetector:
    """
    YOLOv8-based threat detection for X-ray scans
    """
  
    def __init__(self, model_path: str = "models/yolov8x-customs-v2.3.pt"):
        self.model_path = model_path
        self.model = None
        self.gradcam_generator = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.storage = S3Storage()
      
        # Detection classes
        self.classes = {
            0: 'weapon',
            1: 'narcotic',
            2: 'contraband',
            3: 'anomaly'
        }
      
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
  
    async def load_model(self):
        """Load YOLOv8 model and Grad-CAM generator"""
        try:
            logger.info(f"Loading YOLOv8 model from {self.model_path}")
            self.model = YOLO(self.model_path)
            self.model.to(self.device)
          
            # Initialize Grad-CAM
            self.gradcam_generator = GradCAMGenerator(self.model)
          
            logger.info(f"Model loaded successfully on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
  
    async def detect(
        self,
        image_data: bytes,
        container_id: str,
        confidence_threshold: float = 0.70
    ) -> Tuple[List[Dict], Optional[str]]:
        """
        Detect threats in X-ray image
      
        Args:
            image_data: Raw image bytes
            container_id: Container ID for naming gradcam files
            confidence_threshold: Minimum confidence for detections
          
        Returns:
            Tuple of (detections, gradcam_path)
        """
        if not self.model:
            raise RuntimeError("Model not loaded. Call load_model() first.")
      
        # Preprocess image
        image = self._preprocess(image_data)
      
        # Run inference
        logger.debug("Running YOLOv8 inference...")
        results = self.model(image, conf=confidence_threshold)
      
        # Parse detections
        detections = self._parse_results(results[0])
      
        # Generate Grad-CAM heatmap if threats detected
        gradcam_path = None
        if detections:
            logger.debug("Generating Grad-CAM heatmap...")
            gradcam_path = await self._generate_gradcam(
                image,
                detections[0],  # Use highest confidence detection
                container_id
            )
      
        return detections, gradcam_path
  
    def _preprocess(self, image_data: bytes) -> np.ndarray:
        """
        Preprocess image for inference
      
        Steps:
        1. Decode bytes to numpy array
        2. Resize to 1280x1280
        3. Normalize pixel values
        """
        # Decode image
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
      
        if image is None:
            raise ValueError("Failed to decode image")
      
        # Resize to model input size
        image = cv2.resize(image, (1280, 1280))
      
        # Convert grayscale to 3-channel (YOLOv8 expects RGB)
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
      
        return image
  
    def _parse_results(self, result) -> List[Dict]:
        """
        Parse YOLOv8 detection results
      
        Returns:
            List of detections sorted by confidence (descending)
        """
        detections = []
      
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = box.xyxy[0].cpu().numpy().astype(int).tolist()  # [x1, y1, x2, y2]
          
            # Convert to [x, y, width, height]
            x1, y1, x2, y2 = bbox
            bbox_formatted = [x1, y1, x2 - x1, y2 - y1]
          
            detection = {
                'class': self.classes[class_id],
                'confidence': confidence,
                'bbox': bbox_formatted,
                'description': self._get_description(self.classes[class_id], confidence)
            }
          
            detections.append(detection)
      
        # Sort by confidence (highest first)
        detections.sort(key=lambda x: x['confidence'], reverse=True)
      
        return detections
  
    def _get_description(self, class_name: str, confidence: float) -> str:
        """Generate human-readable description"""
        descriptions = {
            'weapon': f"Metallic object with weapon-like characteristics ({confidence:.0%} confidence)",
            'narcotic': f"Package consistent with narcotics ({confidence:.0%} confidence)",
            'contraband': f"Undeclared high-density item detected ({confidence:.0%} confidence)",
            'anomaly': f"Density irregularity detected ({confidence:.0%} confidence)"
        }
        return descriptions.get(class_name, f"{class_name} detected")
  
    async def _generate_gradcam(
        self,
        image: np.ndarray,
        detection: Dict,
        container_id: str
    ) -> str:
        """
        Generate Grad-CAM heatmap for explainability
      
        Returns:
            S3 path to saved heatmap image
        """
        try:
            # Generate heatmap
            heatmap = self.gradcam_generator.generate(
                image,
                target_class=detection['class']
            )
          
            # Overlay heatmap on original image
            overlay = self._overlay_heatmap(image, heatmap)
          
            # Save to S3
            filename = f"{container_id}_gradcam.png"
            s3_path = await self.storage.upload(
                data=cv2.imencode('.png', overlay)[1].tobytes(),
                key=f"gradcam-maps/{filename}",
                content_type="image/png"
            )
          
            logger.info(f"Grad-CAM heatmap saved to {s3_path}")
            return filename
          
        except Exception as e:
            logger.error(f"Failed to generate Grad-CAM: {e}")
            return None
  
    def _overlay_heatmap(
        self,
        image: np.ndarray,
        heatmap: np.ndarray,
        alpha: float = 0.4
    ) -> np.ndarray:
        """
        Overlay Grad-CAM heatmap on original image
      
        Args:
            image: Original image (H, W, 3)
            heatmap: Grad-CAM heatmap (H, W)
            alpha: Transparency of heatmap overlay
          
        Returns:
            Overlaid image
        """
        # Normalize heatmap to 0-255
        heatmap = np.uint8(255 * heatmap)
      
        # Apply colormap (red = high activation)
        heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
      
        # Overlay
        overlay = cv2.addWeighted(image, 1 - alpha, heatmap_colored, alpha, 0)
      
        return overlay
