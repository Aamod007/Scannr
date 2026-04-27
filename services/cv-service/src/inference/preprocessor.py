"""
X-ray image preprocessing pipeline for YOLOv8 inference.

Handles grayscale normalization, CLAHE enhancement, resizing,
and conversion to the 3-channel RGB format expected by YOLOv8.
"""

import cv2
import numpy as np
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class XRayPreprocessor:
    """
    Preprocessing pipeline for customs X-ray scans.

    Steps:
    1. Decode raw bytes to numpy array
    2. Apply CLAHE contrast enhancement (X-ray specific)
    3. Resize to model input dimensions
    4. Convert grayscale to 3-channel RGB
    5. Normalize pixel values to [0, 1]
    """

    def __init__(
        self,
        target_size: Tuple[int, int] = (1280, 1280),
        clahe_clip_limit: float = 2.0,
        clahe_grid_size: Tuple[int, int] = (8, 8),
    ):
        self.target_size = target_size
        self.clahe = cv2.createCLAHE(
            clipLimit=clahe_clip_limit,
            tileGridSize=clahe_grid_size,
        )

    def preprocess_bytes(self, image_data: bytes) -> np.ndarray:
        """
        Full preprocessing pipeline from raw bytes.

        Args:
            image_data: Raw image bytes (JPEG, PNG, DICOM export, etc.)

        Returns:
            Preprocessed image as (H, W, 3) uint8 numpy array
        """
        # Decode
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        if image is None:
            raise ValueError("Failed to decode image from bytes")

        return self.preprocess(image)

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess an already-decoded grayscale image.

        Args:
            image: Grayscale image as (H, W) numpy array

        Returns:
            Preprocessed image as (H, W, 3) uint8 numpy array
        """
        logger.debug(f"Input image shape: {image.shape}")

        # Apply CLAHE contrast enhancement (improves visibility of hidden objects)
        enhanced = self.clahe.apply(image)

        # Resize to model input dimensions
        resized = cv2.resize(enhanced, self.target_size, interpolation=cv2.INTER_LINEAR)

        # Convert grayscale to 3-channel RGB (YOLOv8 expects RGB input)
        rgb = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)

        logger.debug(f"Output image shape: {rgb.shape}")
        return rgb

    def normalize(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize pixel values to [0, 1] float32.

        Args:
            image: Image as uint8 numpy array

        Returns:
            Normalized image as float32 numpy array
        """
        return image.astype(np.float32) / 255.0
