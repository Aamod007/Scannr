"""Evaluate the trained XGBoost risk model on held-out test data."""

import os
import logging
from typing import Dict, Any

import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = os.getenv("MODEL_DIR", "data/models")


def evaluate_model(n_test: int = 1000) -> Dict[str, Any]:
    """Evaluate the current risk model and return metrics.

    Generates a synthetic test set (same distribution as training)
    and computes precision, recall, F1, AUC-ROC, and FNR.

    Returns:
        Dictionary of evaluation metrics.
    """
    model_path = os.path.join(MODEL_DIR, "xgboost_risk_model.json")

    if not os.path.exists(model_path):
        logger.warning("No trained model found — returning baseline metrics")
        return {
            "status": "no_model",
            "precision": 0.0,
            "recall": 0.0,
            "f1": 0.0,
            "auc_roc": 0.0,
            "fnr": 1.0,
        }

    try:
        import xgboost as xgb
        from sklearn.metrics import (
            accuracy_score,
            precision_score,
            recall_score,
            f1_score,
            roc_auc_score,
            confusion_matrix,
        )

        # Load model
        model = xgb.XGBClassifier()
        model.load_model(model_path)

        # Generate test data (with a different seed to avoid overlap)
        from app.model.train import _generate_synthetic_dataset, FEATURE_COLUMNS

        df = _generate_synthetic_dataset(n_samples=n_test, seed=999)
        X_test = df[FEATURE_COLUMNS]
        y_test = df["label"]

        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)

        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average="weighted")
        recall = recall_score(y_test, y_pred, average="weighted")
        f1 = f1_score(y_test, y_pred, average="weighted")

        try:
            auc = roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")
        except Exception:
            auc = 0.0

        cm = confusion_matrix(y_test, y_pred)

        # False Negative Rate for RED lane (class 2)
        red_mask = y_test == 2
        if red_mask.sum() > 0:
            red_actual = y_test[red_mask]
            red_pred = y_pred[red_mask]
            fnr = 1.0 - recall_score(
                (red_actual == 2).astype(int),
                (red_pred == 2).astype(int),
                zero_division=0,
            )
        else:
            fnr = 0.0

        return {
            "status": "evaluated",
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "auc_roc": round(auc, 4),
            "fnr_red_lane": round(fnr, 4),
            "confusion_matrix": cm.tolist(),
            "test_samples": n_test,
        }

    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return {"status": "error", "error": str(e)}
