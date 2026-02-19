"""XGBoost risk scoring — load trained model, predict lane, return feature importances."""

import os
import logging
from typing import Dict, List

import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = os.getenv("MODEL_DIR", "data/models")
MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_risk_model.json")

# Lazy-loaded model singleton
_model = None
_model_loaded = False

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

LANE_MAP = {0: "GREEN", 1: "YELLOW", 2: "RED"}


def _load_model():
    """Load XGBoost model from disk (once)."""
    global _model, _model_loaded
    if _model_loaded:
        return _model

    if os.path.exists(MODEL_PATH):
        try:
            import xgboost as xgb

            _model = xgb.XGBClassifier()
            _model.load_model(MODEL_PATH)
            _model_loaded = True
            logger.info(f"XGBoost model loaded from {MODEL_PATH}")
            return _model
        except Exception as e:
            logger.warning(f"Failed to load XGBoost model: {e}")

    _model = None
    _model_loaded = True  # avoid repeated attempts
    return None


def _fallback_predict(features: Dict) -> Dict:
    """Weighted-sum fallback when no trained XGBoost model is available."""
    trust_weight = 0.40
    vision_weight = 0.30
    cargo_weight = 0.15
    route_weight = 0.10
    intel_weight = 0.05

    # Invert trust score: high trust → low risk
    trust_risk = (100 - features.get("blockchain_trust_score", 50)) * trust_weight

    vision_risk = 0.0
    if features.get("vision_anomaly_flag", False):
        vision_risk = features.get("vision_confidence", 0.0) * 100 * vision_weight
    else:
        vision_risk = features.get("vision_confidence", 0.0) * 20 * vision_weight

    cargo_risk = min(features.get("cargo_declared_value_log", 14) / 20 * 100, 100) * cargo_weight

    route_risk = (
        features.get("route_origin_risk_index", 1.0) * 10
        + features.get("route_transshipment_count", 0) * 10
    ) * route_weight

    intel_risk = 0.0
    if features.get("intel_ofac_match", False):
        intel_risk += 50
    if features.get("intel_un_conflict_flag", False):
        intel_risk += 30
    if features.get("intel_interpol_alert", False):
        intel_risk += 20
    intel_risk *= intel_weight

    risk_score = trust_risk + vision_risk + cargo_risk + route_risk + intel_risk
    risk_score = max(0, min(100, risk_score))

    lane = "GREEN"
    if risk_score > 60:
        lane = "RED"
    elif risk_score > 20:
        lane = "YELLOW"

    return {
        "lane": lane,
        "risk_score": round(risk_score, 2),
        "top_features": _static_top_features(),
        "model_used": "fallback_weighted_sum",
    }


def _static_top_features() -> List[Dict]:
    """Static feature importances for fallback mode."""
    return [
        {"name": "blockchain_trust_score", "importance": 0.40},
        {"name": "vision_confidence", "importance": 0.18},
        {"name": "cargo_declared_value_log", "importance": 0.12},
        {"name": "route_origin_risk_index", "importance": 0.10},
        {"name": "intel_ofac_match", "importance": 0.05},
    ]


def predict_risk(features: Dict) -> Dict:
    """Score a shipment using XGBoost (or fallback).

    Args:
        features: Assembled feature dictionary from assemble.py.

    Returns:
        Dictionary with lane, risk_score, top_features, and model info.
    """
    model = _load_model()

    if model is None:
        return _fallback_predict(features)

    # Build feature vector in correct column order
    feature_vector = np.array(
        [[features.get(col, 0.0) for col in FEATURE_COLUMNS]], dtype=np.float32
    )

    # Predict probabilities
    probs = model.predict_proba(feature_vector)[0]  # [P(GREEN), P(YELLOW), P(RED)]
    pred_class = int(np.argmax(probs))
    lane = LANE_MAP[pred_class]

    # Risk score: weighted blend of class probabilities → 0-100 scale
    risk_score = float(probs[1] * 40 + probs[2] * 100)
    risk_score = max(0, min(100, risk_score))

    # Feature importances from trained model
    importances = model.feature_importances_
    imp_pairs = sorted(
        zip(FEATURE_COLUMNS, importances.tolist()), key=lambda x: x[1], reverse=True
    )
    top = [{"name": n, "importance": round(v, 4)} for n, v in imp_pairs[:7]]

    return {
        "lane": lane,
        "risk_score": round(risk_score, 2),
        "top_features": top,
        "probabilities": {
            "GREEN": round(float(probs[0]), 4),
            "YELLOW": round(float(probs[1]), 4),
            "RED": round(float(probs[2]), 4),
        },
        "model_used": "xgboost",
    }
