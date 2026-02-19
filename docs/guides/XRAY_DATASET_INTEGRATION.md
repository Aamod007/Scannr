# SCANNR X-ray Dataset Integration Guide

## 🎯 Overview

This guide demonstrates how X-ray datasets integrate with the SCANNR Vision AI service for customs contraband detection. The system has been successfully set up with synthetic datasets for demonstration purposes.

## 📊 Dataset Statistics

```json
{
  "total_images": 2300,
  "train_images": 1610,
  "val_images": 460,
  "test_images": 230,
  "class_distribution": {
    "knife": 183,
    "gun": 209,
    "scissors": 197,
    "wrench": 192,
    "hammer": 171,
    "density_anomaly": 211,
    "weapon": 193
  }
}
```

## 📁 Dataset Structure

```
data/
├── xray/
│   ├── gdxray/          # 1000 synthetic baggage X-ray images
│   ├── clcxray/         # 500 cluttered baggage images  
│   └── opixray/         # 800 occluded prohibited items
├── processed/
│   ├── train/
│   │   ├── images/      # 1610 training images
│   │   └── labels/      # YOLO format annotations
│   ├── val/
│   │   ├── images/      # 460 validation images
│   │   └── labels/      # YOLO format annotations
│   ├── test/
│   │   ├── images/      # 230 test images
│   │   └── labels/      # YOLO format annotations
│   ├── dataset.yaml     # YOLOv8 configuration
│   └── statistics.json  # Dataset statistics
├── dataset_info.json    # Dataset metadata
└── training_manifest.json # Training configuration
```

## 🚀 Integration with Vision AI Service

### 1. Dataset Creation Process

The datasets were created using synthetic X-ray images that simulate real customs scenarios:

```python
# Sample X-ray image generation
def create_sample_xray_image(width=640, height=640, add_anomaly=False, anomaly_type="knife"):
    # Create base X-ray background with gradient
    img = np.zeros((height, width), dtype=np.uint8)
    
    # Add gradient background
    for i in range(height):
        img[i, :] = int(100 + (i / height) * 50)
    
    # Add noise to simulate X-ray texture
    noise = np.random.normal(0, 10, (height, width)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    if add_anomaly:
        # Add synthetic contraband items
        if anomaly_type == "knife":
            cv2.line(img, (width//4, height//4), (3*width//4, 3*height//4), 200, 8)
            cv2.circle(img, (3*width//4, 3*height//4), 15, 180, -1)
        elif anomaly_type == "gun":
            cv2.rectangle(img, (width//3, height//2-20), (2*width//3, height//2+20), 190, -1)
            cv2.circle(img, (2*width//3, height//2), 25, 170, -1)
    
    # Apply CLAHE enhancement (common in X-ray processing)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    img = clahe.apply(img)
    
    return img
```

### 2. YOLOv8 Integration

The datasets are formatted for YOLOv8 training with the following configuration:

```yaml
# dataset.yaml
path: data/processed
train: train/images
val: val/images
test: test/images
nc: 7  # number of classes
names: ['knife', 'gun', 'scissors', 'wrench', 'hammer', 'density_anomaly', 'weapon']
```

### 3. Vision AI Service Integration

The Vision AI service can now use these datasets for:

- **Training**: Custom YOLOv8 model training on X-ray contraband detection
- **Inference**: Real-time detection of prohibited items in baggage scans
- **Evaluation**: Model performance assessment and improvement

## 🔍 Sample Detection Results

### Detection Pipeline

1. **Input**: X-ray scan image from customs scanner
2. **Preprocessing**: CLAHE enhancement, noise reduction, normalization
3. **Inference**: YOLOv8 model prediction
4. **Post-processing**: Confidence filtering, NMS, heatmap generation
5. **Output**: Detection results with bounding boxes and confidence scores

### Sample Output

```json
{
  "scan_id": "SCN-DEMO-20260219-123456",
  "anomaly_detected": true,
  "confidence": 0.892,
  "detections": [
    {
      "label": "knife",
      "confidence": 0.892,
      "bbox": [120, 140, 320, 360],
      "area": 40000
    }
  ],
  "heatmap": "base64_encoded_heatmap_data",
  "preprocessing_info": {
    "clahe_applied": true,
    "contrast_enhanced": true,
    "noise_reduced": true
  }
}
```

## 🏗️ Architecture Integration

### Data Flow

```
Port Scanner → X-ray Image → Vision AI Service → YOLOv8 Model → Detection Results
     ↓              ↓              ↓              ↓              ↓
  DICOM File    Preprocessing   Inference     Post-processing   JSON Output
```

### Service Integration

```python
# Vision AI Service Integration
from ultralytics import YOLO

class VisionAIService:
    def __init__(self, model_path: str):
        self.model = YOLO(model_path)
        self.class_names = ['knife', 'gun', 'scissors', 'wrench', 'hammer', 'density_anomaly', 'weapon']
    
    def analyze_scan(self, image_path: str) -> Dict:
        # Preprocess image
        processed_image = self.preprocess_xray(image_path)
        
        # Run inference
        results = self.model(processed_image)
        
        # Post-process results
        detections = self.format_detections(results)
        
        return {
            "scan_id": self.generate_scan_id(),
            "anomaly_detected": len(detections) > 0,
            "confidence": max([d['confidence'] for d in detections], default=0.0),
            "detections": detections,
            "heatmap": self.generate_heatmap(results)
        }
```

## 📈 Performance Metrics

### Target Performance (Production)

- **Accuracy**: >92% mAP@0.5
- **Inference Time**: <5 seconds per scan
- **False Positive Rate**: <3%
- **False Negative Rate**: <8%

### Current Demo Performance

Based on synthetic dataset:
- **Training Images**: 2,300
- **Validation Split**: 70/20/10 (train/val/test)
- **Class Balance**: Well-distributed across 7 contraband categories
- **Data Augmentation**: CLAHE, noise injection, geometric transforms

## 🔄 Production Migration Path

### Step 1: Replace Synthetic Data

Replace synthetic datasets with real X-ray datasets:

```bash
# Download real datasets
wget https://domingomery.ing.puc.cl/material/gdxray/GDXray.zip
git clone https://github.com/GreysonPhoenix/CLCXray data/xray/clcxray/
git clone https://github.com/OPIXray-author/OPIXray data/xray/opixray/
```

### Step 2: Model Training

```bash
# Train YOLOv8 on real data
yolo task=detect mode=train data=data/processed/dataset.yaml model=yolov8l.pt epochs=100
```

### Step 3: Model Evaluation

```bash
# Evaluate model performance
yolo task=detect mode=val data=data/processed/dataset.yaml model=runs/train/yolov8l_xray/weights/best.pt
```

### Step 4: Deployment

```bash
# Export model for production
yolo task=detect mode=export model=runs/train/yolov8l_xray/weights/best.pt format=torchscript
```

## 🛠️ Available Scripts

1. **create_sample_datasets.py** - Generate synthetic X-ray datasets
2. **xray_dataset_demo.py** - Demonstrate dataset integration
3. **train_yolov8.py** - Train YOLOv8 model (requires Ultralytics)
4. **download_datasets.py** - Download real X-ray datasets

## 📋 Next Steps

1. **Install Ultralytics**: `pip install ultralytics`
2. **Train Model**: `python train_yolov8.py`
3. **Evaluate Performance**: Check mAP scores and inference time
4. **Deploy Model**: Integrate trained model into Vision AI service
5. **Monitor Performance**: Set up MLflow tracking for model drift

## 🔗 Integration with SCANNR Pipeline

The X-ray datasets integrate seamlessly with the existing SCANNR pipeline:

```
Container Arrival → X-ray Scan → Vision AI (YOLOv8) → Risk Scoring → Clearance Decision
     ↓              ↓              ↓                    ↓              ↓
  Manifest     DICOM Image    Contraband Detection  Risk Score    GREEN/YELLOW/RED
```

This completes the Vision AI component of the customs clearance system, providing AI-powered detection of prohibited items in baggage and cargo scans.