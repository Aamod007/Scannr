"""XGBoost risk model training with MLflow tracking.

Trains a gradient-boosted classifier on 25+ feature inputs,
logs metrics / artefacts to MLflow, and persists the best model.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import (
    roc_auc_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
)
import joblib

logger = logging.getLogger(__name__)

MODEL_DIR = os.getenv("MODEL_DIR", "data/models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Feature columns aligned with assemble.py
FEATURE_COLUMNS = [
    "blockchain_trust_score",
    "years_active",
    "violation_count",
    "aeo_tier",
    "recent_clean_inspections",
    "vision_anomaly_flag",
    "vision_confidence",
    "vision_detection_count",
    "vision_class_encoded",
    "cargo_hs_risk_weight",
    "cargo_declared_value_log",
    "cargo_weight",
    "cargo_volume",
    "cargo_category_encoded",
    "cargo_value_weight_ratio",
    "route_origin_risk_index",
    "route_transshipment_count",
    "route_carrier_risk",
    "route_port_risk",
    "intel_ofac_match",
    "intel_un_conflict_flag",
    "intel_interpol_alert",
    "intel_seasonal_index",
    "intel_composite_score",
    "trust_vision_interaction",
]

VISION_CLASS_MAP = {
    "none": 0,
    "weapon": 1,
    "narcotic": 2,
    "undeclared_goods": 3,
    "density_anomaly": 4,
}

CARGO_CATEGORY_MAP = {
    "unknown": 0,
    "electronics": 1,
    "textiles": 2,
    "chemicals": 3,
    "metals": 4,
    "food": 5,
    "machinery": 6,
    "pharmaceuticals": 7,
}


def _generate_synthetic_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generate realistic synthetic training data from clearance rules."""
    rng = np.random.RandomState(seed)

    data = {
        "blockchain_trust_score": rng.uniform(0, 100, n_samples),
        "years_active": rng.randint(0, 30, n_samples),
        "violation_count": rng.poisson(1.5, n_samples),
        "aeo_tier": rng.choice([0, 1, 2, 3], n_samples, p=[0.3, 0.3, 0.25, 0.15]),
        "recent_clean_inspections": rng.randint(0, 50, n_samples),
        "vision_anomaly_flag": rng.choice([0, 1], n_samples, p=[0.85, 0.15]),
        "vision_confidence": rng.uniform(0, 1, n_samples),
        "vision_detection_count": rng.poisson(0.3, n_samples),
        "vision_class_encoded": rng.choice(
            [0, 1, 2, 3, 4], n_samples, p=[0.80, 0.05, 0.05, 0.05, 0.05]
        ),
        "cargo_hs_risk_weight": rng.uniform(0.5, 3.0, n_samples),
        "cargo_declared_value_log": rng.uniform(10, 20, n_samples),
        "cargo_weight": rng.uniform(100, 50000, n_samples),
        "cargo_volume": rng.uniform(1, 100, n_samples),
        "cargo_category_encoded": rng.randint(0, 8, n_samples),
        "cargo_value_weight_ratio": rng.uniform(0.01, 500, n_samples),
        "route_origin_risk_index": rng.uniform(0, 10, n_samples),
        "route_transshipment_count": rng.poisson(0.8, n_samples),
        "route_carrier_risk": rng.uniform(0, 5, n_samples),
        "route_port_risk": rng.uniform(0, 5, n_samples),
        "intel_ofac_match": rng.choice([0, 1], n_samples, p=[0.98, 0.02]),
        "intel_un_conflict_flag": rng.choice([0, 1], n_samples, p=[0.95, 0.05]),
        "intel_interpol_alert": rng.choice([0, 1], n_samples, p=[0.99, 0.01]),
        "intel_seasonal_index": rng.uniform(0.5, 8.0, n_samples),
        "intel_composite_score": rng.uniform(0, 50, n_samples),
        "trust_vision_interaction": rng.uniform(0, 100, n_samples),
    }

    df = pd.DataFrame(data)

    # Derive interaction feature
    df["trust_vision_interaction"] = (
        (100 - df["blockchain_trust_score"]) * df["vision_confidence"]
    )

    # Generate labels (risk lane) using weighted rule-based logic
    risk = (
        (100 - df["blockchain_trust_score"]) * 0.40
        + df["vision_anomaly_flag"] * 60 * 0.30
        + df["vision_confidence"] * 40 * 0.30
        + df["cargo_hs_risk_weight"] * 15 * 0.15
        + df["route_origin_risk_index"] * 5 * 0.10
        + df["intel_ofac_match"] * 50 * 0.05
        + df["intel_un_conflict_flag"] * 30 * 0.05
    )

    # Map to lane: GREEN=0 (0-20), YELLOW=1 (21-60), RED=2 (61-100)
    df["label"] = pd.cut(
        risk,
        bins=[-np.inf, 20, 60, np.inf],
        labels=[0, 1, 2],
    ).astype(int)

    return df


def train_model(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Train an XGBoost risk classification model.

    Args:
        config: Optional hyperparameter overrides.

    Returns:
        Dictionary with training results and metrics.
    """
    config = config or {}

    logger.info("Generating synthetic training dataset...")
    df = _generate_synthetic_dataset(
        n_samples=config.get("n_samples", 5000),
        seed=config.get("seed", 42),
    )

    X = df[FEATURE_COLUMNS]
    y = df["label"]

    # Train/test split  (stratified)
    from sklearn.model_selection import train_test_split

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # XGBoost hyperparameters (PRD §5.3)
    params = {
        "n_estimators": config.get("n_estimators", 300),
        "max_depth": config.get("max_depth", 6),
        "learning_rate": config.get("learning_rate", 0.1),
        "subsample": config.get("subsample", 0.8),
        "colsample_bytree": config.get("colsample_bytree", 0.8),
        "min_child_weight": config.get("min_child_weight", 3),
        "objective": "multi:softprob",
        "num_class": 3,
        "eval_metric": "mlogloss",
        "random_state": 42,
        "use_label_encoder": False,
    }

    logger.info(f"Training XGBoost with params: {params}")
    model = xgb.XGBClassifier(**params)

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted")
    recall = recall_score(y_test, y_pred, average="weighted")
    f1 = f1_score(y_test, y_pred, average="weighted")

    # One-vs-rest AUC-ROC
    try:
        auc = roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")
    except Exception:
        auc = 0.0

    # Cross-validation
    cv_scores = cross_val_score(
        xgb.XGBClassifier(**params),
        X,
        y,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="accuracy",
    )

    # Feature importances
    importances = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)

    # Save model
    model_path = os.path.join(MODEL_DIR, "xgboost_risk_model.json")
    model.save_model(model_path)
    joblib.dump(model, os.path.join(MODEL_DIR, "xgboost_risk_model.pkl"))

    # Try to log to MLflow
    try:
        import mlflow
        import mlflow.xgboost

        mlflow.set_experiment("scannr-risk-scoring")
        with mlflow.start_run(run_name="xgboost-risk-model"):
            mlflow.log_params(params)
            mlflow.log_metrics(
                {
                    "accuracy": accuracy,
                    "precision": precision,
                    "recall": recall,
                    "f1": f1,
                    "auc_roc": auc,
                    "cv_mean": float(cv_scores.mean()),
                    "cv_std": float(cv_scores.std()),
                }
            )
            mlflow.xgboost.log_model(model, "risk-model")
            logger.info("Model logged to MLflow")
    except Exception as e:
        logger.warning(f"MLflow logging skipped: {e}")

    results = {
        "status": "trained",
        "model": "xgboost",
        "model_path": model_path,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "auc_roc": round(auc, 4),
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std": round(float(cv_scores.std()), 4),
        "feature_importances": [
            {"name": name, "importance": round(imp, 4)} for name, imp in sorted_imp[:10]
        ],
        "classification_report": classification_report(y_test, y_pred, output_dict=True),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }

    logger.info(f"Training complete: accuracy={accuracy:.4f}, auc_roc={auc:.4f}")
    return results
