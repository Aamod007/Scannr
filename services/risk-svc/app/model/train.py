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


def _load_training_data(data_path: str = None) -> pd.DataFrame:
    """Load real training data from open-source datasets.

    Searches for CSV files in data/risk/ directory. Requires real data
    downloaded via: python scripts/data/download_datasets.py

    Args:
        data_path: Optional explicit path to a CSV file with training data.

    Returns:
        DataFrame with feature columns and 'label' column (0=GREEN, 1=YELLOW, 2=RED).

    Raises:
        FileNotFoundError: If no training data is available.
    """
    search_paths = [
        data_path,
        os.path.join(os.getenv("DATA_DIR", "data"), "risk", "customs_risk_training.csv"),
        os.path.join("data", "risk", "customs_risk_training.csv"),
    ]

    for path in search_paths:
        if path and os.path.exists(path):
            logger.info(f"Loading training data from {path}")
            df = pd.read_csv(path)

            # Encode categorical columns if present
            if "vision_class" in df.columns:
                df["vision_class_encoded"] = df["vision_class"].map(VISION_CLASS_MAP).fillna(0).astype(int)
            if "cargo_category" in df.columns:
                df["cargo_category_encoded"] = df["cargo_category"].map(CARGO_CATEGORY_MAP).fillna(0).astype(int)

            # Derive computed features if missing
            if "cargo_declared_value_log" not in df.columns and "cargo_declared_value" in df.columns:
                import math
                df["cargo_declared_value_log"] = df["cargo_declared_value"].clip(lower=1).apply(math.log)
            if "cargo_value_weight_ratio" not in df.columns:
                df["cargo_value_weight_ratio"] = df.get("cargo_declared_value", 1) / df.get("cargo_weight", 1).clip(lower=1)
            if "intel_composite_score" not in df.columns:
                df["intel_composite_score"] = (
                    df.get("intel_ofac_match", 0) * 50
                    + df.get("intel_un_conflict_flag", 0) * 30
                    + df.get("intel_interpol_alert", 0) * 20
                    + df.get("intel_seasonal_index", 1.0)
                )
            if "trust_vision_interaction" not in df.columns:
                df["trust_vision_interaction"] = (
                    (100 - df.get("blockchain_trust_score", 50)) * df.get("vision_confidence", 0)
                )

            # Map label column
            if "lane_code" in df.columns and "label" not in df.columns:
                df["label"] = df["lane_code"]
            elif "lane" in df.columns and "label" not in df.columns:
                lane_map = {"GREEN": 0, "YELLOW": 1, "RED": 2}
                df["label"] = df["lane"].map(lane_map).fillna(1).astype(int)

            # Ensure all feature columns exist with defaults
            for col in FEATURE_COLUMNS:
                if col not in df.columns:
                    df[col] = 0.0

            logger.info(f"Loaded {len(df)} training samples from {path}")
            return df

    raise FileNotFoundError(
        "No training data found. Download real datasets first:\n"
        "  python scripts/data/download_datasets.py\n"
        "Expected CSV at: data/risk/customs_risk_training.csv"
    )


def train_model(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Train an XGBoost risk classification model.

    Args:
        config: Optional hyperparameter overrides.

    Returns:
        Dictionary with training results and metrics.
    """
    config = config or {}

    logger.info("Loading training data from open-source datasets...")
    df = _load_training_data(
        data_path=config.get("data_path", None),
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
