from typing import Dict


def run_inference(preprocessed: Dict, payload: Dict):
    simulate = bool(payload.get("simulate_anomaly", False))
    confidence = payload.get("confidence", 0.05)
    if simulate:
        confidence = max(confidence, 0.85)
    detections = []
    if simulate:
        detections.append(
            {
                "label": payload.get("anomaly_class", "density_anomaly"),
                "confidence": round(float(confidence), 3),
                "bbox": [120, 140, 320, 360],
            }
        )
    return {
        "scan_id": preprocessed["scan_id"],
        "anomaly_detected": simulate,
        "heatmap_url": "https://storage.scannr.in/heatmaps/demo.png",
        "confidence": round(float(confidence), 3),
        "detections": detections,
        "preprocess": preprocessed,
    }
