from ultralytics import YOLO
import mlflow
import os

def train_yolov8(
    data_yaml_path: str = "data.yaml",
    epochs: int = 100,
    batch_size: int = 32,
    img_size: int = 640,
    model_name: str = "yolov8m.pt"  # Medium model for balance
):
    """
    Train YOLOv8 model for customs object detection.

    Args:
        data_yaml_path (str): Path to dataset configuration YAML.
        epochs (int): Number of training epochs.
        batch_size (int): Batch size.
        img_size (int): Image size for input.
        model_name (str): Base model to start transfer learning from.
    """

    print(f"Starting YOLOv8 training with {model_name} on {data_yaml_path}...")

    # Initialize YOLOv8 model
    model = YOLO(model_name)

    # MLflow tracking
    mlflow.set_experiment("scannr-vision-training")

    with mlflow.start_run():
        # Log parameters
        mlflow.log_param("epochs", epochs)
        mlflow.log_param("batch_size", batch_size)
        mlflow.log_param("model_name", model_name)
        mlflow.log_param("img_size", img_size)

        # Train the model
        results = model.train(
            data=data_yaml_path,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            optimizer="AdamW",
            lr0=0.01,
            lrf=0.01,  # Cosine LR schedule
            augment=True,
            val=True,
            project="runs/detect",  # Output directory
            name="scannr_vision_model",  # Experiment name
            exist_ok=True
        )

        # Validate the model
        metrics = model.val()

        # Log metrics to MLflow
        mlflow.log_metric("map50", metrics.box.map50)
        mlflow.log_metric("map50-95", metrics.box.map)
        mlflow.log_metric("precision", metrics.box.mp)  # mean precision
        mlflow.log_metric("recall", metrics.box.mr)    # mean recall

        print(f"Training complete. Validation mAP50: {metrics.box.map50}")

        # Save the best model artifact
        best_model_path = os.path.join("runs/detect/scannr_vision_model/weights/best.pt")
        mlflow.log_artifact(best_model_path)

        return results

if __name__ == "__main__":
    # Example usage:
    # Ensure you have a 'data.yaml' file pointing to your dataset
    # train_yolov8(data_yaml_path="dataset.yaml")
    pass
