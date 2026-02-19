import cv2
import numpy as np

def preprocess_xray(image_path: str, output_size: tuple = (640, 640)) -> np.ndarray:
    """
    Preprocess X-ray image for YOLOv8.
    Steps:
    1. Read image (handle DICOM if needed, but for now assuming image format like PNG/JPG).
    2. Convert to grayscale if not already.
    3. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization).
    4. Resize to output_size.
    5. Convert back to 3-channel (BGR) for YOLOv8 compatibility.
    """
    try:
        # Step 1: Read image
        image = cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f"Image not found at {image_path}")

        # Step 2: Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Step 3: Apply CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Step 4: Resize
        resized = cv2.resize(enhanced, output_size)

        # Step 5: Convert back to BGR (YOLOv8 expects 3 channels)
        bgr_image = cv2.cvtColor(resized, cv2.COLOR_GRAY2BGR)

        return bgr_image

    except Exception as e:
        print(f"Error preprocessing image {image_path}: {e}")
        raise e
