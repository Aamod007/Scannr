"""Evaluate the trained XGBoost risk model on held-out test data."""

import os
import logging
from typing import Dict, Any

import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = os.getenv("MODEL_DIR", "data/models")


def evaluate_model(n_test: int = 1000) -> Dict[str, Any]:
    """Evaluate the current risk model and return metrics.

    Loads the same training data as train.py, holds out 20% as a test set
    (using the same random seed), and computes precision, recall, F1, AUC-ROC, and FNR.

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

        # Load real test data
        from app.model.train import _load_training_data, FEATURE_COLUMNS
        from sklearn.model_selection import train_test_split

        df = _load_training_data()
        # Use last 20% as test set (same split as training)
        _, df_test = train_test_split(df, test_size=0.2, stratify=df["label"], random_state=42)
        X_test = df_test[FEATURE_COLUMNS]
        y_test = df_test["label"]

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
