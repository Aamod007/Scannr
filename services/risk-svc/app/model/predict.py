from typing import Dict
from app.features.assemble import top_features


def predict_risk(features: Dict) -> Dict:
    trust_weight = 0.40
    vision_weight = 0.30
    cargo_weight = 0.15
    route_weight = 0.10
    intel_weight = 0.05

    trust_score = features["blockchain_trust_score"]
    vision_score = 100 if features["vision_anomaly_flag"] else 0
    cargo_score = min(features["cargo_declared_value"] / 1000000, 100)
    route_score = (
        features["route_origin_risk_index"] * 50 + features["route_transshipment_count"] * 10
    )
    intel_score = 0
    if features["intel_ofac_match"]:
        intel_score += 50
    if features["intel_un_conflict_flag"]:
        intel_score += 30
    if features["intel_interpol_alert"]:
        intel_score += 20

    risk_score = (
        trust_score * trust_weight
        + vision_score * vision_weight
        + cargo_score * cargo_weight
        + route_score * route_weight
        + intel_score * intel_weight
    )
    risk_score = max(0, min(100, risk_score))

    lane = "GREEN"
    if risk_score > 60:
        lane = "RED"
    elif risk_score > 20:
        lane = "YELLOW"

    return {
        "lane": lane,
        "risk_score": round(risk_score, 2),
        "top_features": top_features(features),
    }
