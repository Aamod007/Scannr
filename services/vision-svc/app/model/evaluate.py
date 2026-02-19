from ultralytics import YOLO
import mlflow
import os

def evaluate_model(
    model_path: str = "runs/detect/scannr_vision_model/weights/best.pt",
    data_yaml_path: str = "data.yaml",
    img_size: int = 640
):
    """
    Evaluate trained YOLOv8 model on validation set.

    Args:
        model_path (str): Path to trained model.
        data_yaml_path (str): Path to dataset config.
        img_size (int): Image size.
    """

    # Initialize model
    try:
        model = YOLO(model_path)
    except FileNotFoundError:
        print(f"Model file not found at {model_path}. Please train first.")
        return

    print(f"Evaluating model {model_path} on {data_yaml_path}...")

    # Run validation
    metrics = model.val(
        data=data_yaml_path,
        imgsz=img_size,
        conf=0.25,
        iou=0.6,
        split='val',
        save_json=True  # Save results to JSON for further analysis
    )

    # Extract metrics
    map50 = metrics.box.map50
    map50_95 = metrics.box.map
    precision = metrics.box.mp
    recall = metrics.box.mr

    # Log to MLflow (optional if running standalone)
    try:
        mlflow.log_metric("val_map50", map50)
        mlflow.log_metric("val_map50_95", map50_95)
        mlflow.log_metric("val_precision", precision)
        mlflow.log_metric("val_recall", recall)
    except Exception:
        pass # MLflow might not be active

    print(f"Evaluation Results:")
    print(f"mAP50: {map50:.4f}")
    print(f"mAP50-95: {map50_95:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")

    return {
        "map50": map50,
        "map50_95": map50_95,
        "precision": precision,
        "recall": recall
    }

if __name__ == "__main__":
    # Example usage
    # evaluate_model(data_yaml_path="dataset.yaml")
    pass
