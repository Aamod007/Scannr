def train_model(config):
    return {
        "status": "trained",
        "epochs": config.get("epochs", 100),
        "batch_size": config.get("batch_size", 32),
        "architecture": config.get("architecture", "yolov8-large"),
    }
