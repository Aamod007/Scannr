def register_model(name, version):
    return {"name": name, "version": version, "status": "registered"}

def list_models():
    return [
        {"name": "vision-yolov8", "version": "v1.0.0"},
        {"name": "risk-xgboost", "version": "v1.0.0"},
    ]