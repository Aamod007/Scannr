"""Assemble all 25+ risk features from raw payload.

Feature groups (PRD §5.3.1):
  - Blockchain trust  (40% weight)
  - Vision AI output  (30% weight)
  - Cargo details     (15% weight)
  - Route risk        (10% weight)
  - External intel    ( 5% weight)
"""

import math
import logging
from typing import Dict, List

from app.features.ofac import check_ofac_match, check_un_sanctions, check_interpol_alert
from app.features.origin_risk import get_origin_risk_index

logger = logging.getLogger(__name__)

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

# Default HS code risk weights (until tariff-sync-svc populates them)
HS_RISK_WEIGHTS: Dict[str, float] = {
    "8471.30": 1.2,  # Electronics
    "7108.12": 1.8,  # Gold
    "8542.31": 1.4,  # ICs
    "3004.90": 1.5,  # Pharmaceuticals
    "9306.30": 2.5,  # Ammunition
    "2933.39": 2.0,  # Chemical precursors
}


def assemble_features(payload: Dict) -> Dict:
    """Build the full 25-feature vector from a raw scoring request.

    Args:
        payload: Raw JSON body from /score endpoint.

    Returns:
        Dictionary keyed by feature column names used by the XGBoost model.
    """
    # --- Blockchain trust features ---
    blockchain_trust = payload.get("blockchain_trust_score", 50.0)
    years_active = payload.get("years_active", 0)
    violation_count = payload.get("violation_count", 0)
    aeo_tier = payload.get("aeo_tier", 0)
    recent_clean = payload.get("recent_clean_inspections", 0)

    # --- Vision AI output features ---
    vision_anomaly = 1 if payload.get("vision_anomaly_flag", False) else 0
    vision_conf = payload.get("vision_confidence", 0.0)
    vision_det_count = payload.get("vision_detection_count", 0)
    vision_class_raw = payload.get("vision_class", "none")
    vision_class_enc = VISION_CLASS_MAP.get(vision_class_raw, 0)

    # --- Cargo features ---
    hs_code = str(payload.get("cargo_hs_code", "0000.00"))
    hs_prefix = hs_code[:7]
    cargo_hs_risk_weight = HS_RISK_WEIGHTS.get(hs_prefix, 1.0)
    declared_value = max(payload.get("cargo_declared_value", 1.0), 1.0)
    cargo_value_log = math.log(declared_value)
    cargo_weight = payload.get("cargo_weight", 0.0)
    cargo_volume = payload.get("cargo_volume", 0.0)
    cargo_cat_raw = payload.get("cargo_category", "unknown")
    cargo_cat_enc = CARGO_CATEGORY_MAP.get(cargo_cat_raw, 0)
    value_weight_ratio = declared_value / max(cargo_weight, 1.0)

    # --- Route risk features ---
    origin_country = payload.get("origin_country", "")
    origin_risk = payload.get("route_origin_risk_index", None)
    if origin_risk is None and origin_country:
        origin_risk = get_origin_risk_index(origin_country).get("risk_index", 1.0)
    elif origin_risk is None:
        origin_risk = 1.0
    transshipment_count = payload.get("route_transshipment_count", 0)
    carrier_risk = payload.get("route_carrier_risk", payload.get("route_carrier_history", 0))
    port_risk = payload.get("route_port_risk", 1.0)

    # --- External intelligence features ---
    importer_name = payload.get("importer_name", "")
    ofac = payload.get("intel_ofac_match", None)
    if ofac is None and importer_name:
        ofac = check_ofac_match(importer_name)
    ofac = 1 if ofac else 0

    un_flag = payload.get("intel_un_conflict_flag", None)
    if un_flag is None and origin_country:
        un_flag = check_un_sanctions(origin_country)
    un_flag = 1 if un_flag else 0

    interpol = payload.get("intel_interpol_alert", None)
    if interpol is None and importer_name:
        interpol = check_interpol_alert(importer_name)
    interpol = 1 if interpol else 0

    seasonal = payload.get("intel_seasonal_index", 1.0)
    intel_composite = ofac * 50 + un_flag * 30 + interpol * 20 + seasonal

    # --- Interaction features ---
    trust_vision = (100 - blockchain_trust) * vision_conf

    return {
        # Blockchain
        "blockchain_trust_score": float(blockchain_trust),
        "years_active": int(years_active),
        "violation_count": int(violation_count),
        "aeo_tier": int(aeo_tier),
        "recent_clean_inspections": int(recent_clean),
        # Vision
        "vision_anomaly_flag": vision_anomaly,
        "vision_confidence": float(vision_conf),
        "vision_detection_count": int(vision_det_count),
        "vision_class_encoded": int(vision_class_enc),
        # Cargo
        "cargo_hs_risk_weight": float(cargo_hs_risk_weight),
        "cargo_declared_value_log": float(cargo_value_log),
        "cargo_weight": float(cargo_weight),
        "cargo_volume": float(cargo_volume),
        "cargo_category_encoded": int(cargo_cat_enc),
        "cargo_value_weight_ratio": float(value_weight_ratio),
        # Route
        "route_origin_risk_index": float(origin_risk),
        "route_transshipment_count": int(transshipment_count),
        "route_carrier_risk": float(carrier_risk),
        "route_port_risk": float(port_risk),
        # Intel
        "intel_ofac_match": int(ofac),
        "intel_un_conflict_flag": int(un_flag),
        "intel_interpol_alert": int(interpol),
        "intel_seasonal_index": float(seasonal),
        "intel_composite_score": float(intel_composite),
        # Interaction
        "trust_vision_interaction": float(trust_vision),
    }


def top_features(features: Dict) -> List[Dict]:
    """Return the most influential features based on magnitude.

    This is used as a lightweight substitute when the XGBoost model
    is not loaded (the real importances come from predict.py).
    """
    weights = {
        "blockchain_trust_score": 0.40,
        "vision_confidence": 0.18,
        "cargo_hs_risk_weight": 0.12,
        "route_origin_risk_index": 0.10,
        "intel_composite_score": 0.07,
        "trust_vision_interaction": 0.05,
        "cargo_value_weight_ratio": 0.04,
        "violation_count": 0.04,
    }
    return [
        {"name": name, "importance": round(imp, 4)} for name, imp in weights.items()
    ]


def update_hs_risk_weights(new_weights: Dict[str, float]) -> None:
    """Hot-reload HS code risk weights from tariff-sync-svc.

    Called when tariff-sync-svc detects an update from CBIC API.
    """
    global HS_RISK_WEIGHTS
    HS_RISK_WEIGHTS.update(new_weights)
    logger.info(f"Updated {len(new_weights)} HS risk weights")
