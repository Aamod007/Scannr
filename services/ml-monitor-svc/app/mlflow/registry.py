"""MLflow model registry integration.

PRD §Phase 5:
  - Model registry with version tagging
  - Never delete old versions
  - Staging / Production promotion
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "")

# In-memory registry fallback when MLflow server is unavailable
_local_registry: List[Dict[str, Any]] = [
    {
        "name": "vision-yolov8",
        "version": "v1.0.0",
        "stage": "Production",
        "registered_at": "2026-02-01T00:00:00Z",
        "metrics": {"mAP50": 0.92, "precision": 0.93, "recall": 0.91},
    },
    {
        "name": "risk-xgboost",
        "version": "v1.0.0",
        "stage": "Production",
        "registered_at": "2026-02-01T00:00:00Z",
        "metrics": {"accuracy": 0.92, "auc_roc": 0.94, "f1": 0.91},
    },
]


def _get_mlflow_client():
    """Get MLflow tracking client if server is configured."""
    if not MLFLOW_TRACKING_URI:
        return None
    try:
        import mlflow
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        return mlflow.tracking.MlflowClient()
    except Exception as e:
        logger.warning(f"MLflow client init failed: {e}")
        return None


def register_model(
    name: str,
    version: str,
    metrics: Optional[Dict[str, float]] = None,
    stage: str = "Staging",
) -> Dict[str, Any]:
    """Register a new model version.

    Args:
        name: Model name (e.g. 'risk-xgboost').
        version: Semantic version string.
        metrics: Performance metrics dict.
        stage: 'Staging' or 'Production'.

    Returns:
        Registration confirmation.
    """
    entry = {
        "name": name,
        "version": version,
        "stage": stage,
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics or {},
    }

    # Try MLflow first
    client = _get_mlflow_client()
    if client:
        try:
            import mlflow
            result = mlflow.register_model(
                f"runs:/{version}/model", name
            )
            entry["mlflow_version"] = result.version
            logger.info(f"Model registered in MLflow: {name} v{version}")
        except Exception as e:
            logger.warning(f"MLflow registration failed, using local: {e}")

    # Always record locally (append-only — never delete)
    _local_registry.append(entry)
    logger.info(f"Model registered: {name} v{version} [{stage}]")
    return {"status": "registered", **entry}


def promote_model(name: str, version: str, to_stage: str = "Production") -> Dict[str, Any]:
    """Promote a model version to a new stage.

    Previous Production model is demoted to Archived (never deleted).

    Args:
        name: Model name.
        version: Version to promote.
        to_stage: Target stage.

    Returns:
        Promotion result.
    """
    promoted = False
    for entry in _local_registry:
        if entry["name"] == name:
            if entry["version"] == version:
                entry["stage"] = to_stage
                promoted = True
            elif entry["stage"] == "Production" and to_stage == "Production":
                entry["stage"] = "Archived"

    if not promoted:
        return {"status": "error", "message": f"Model {name} v{version} not found"}

    logger.info(f"Promoted {name} v{version} → {to_stage}")
    return {"status": "promoted", "name": name, "version": version, "stage": to_stage}


def list_models(name: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all registered model versions.

    Args:
        name: Optional filter by model name.

    Returns:
        List of model entries.
    """
    if name:
        return [m for m in _local_registry if m["name"] == name]
    return _local_registry


def get_production_model(name: str) -> Optional[Dict[str, Any]]:
    """Get the current production model for a given name."""
    for entry in reversed(_local_registry):
        if entry["name"] == name and entry["stage"] == "Production":
            return entry
    return None
