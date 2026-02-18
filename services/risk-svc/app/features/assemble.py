from typing import Dict, List


def assemble_features(payload: Dict) -> Dict:
    return {
        "blockchain_trust_score": payload.get("blockchain_trust_score", 50.0),
        "years_active": payload.get("years_active", 0),
        "violation_count": payload.get("violation_count", 0),
        "aeo_tier": payload.get("aeo_tier", 0),
        "vision_anomaly_flag": payload.get("vision_anomaly_flag", False),
        "vision_confidence": payload.get("vision_confidence", 0.0),
        "vision_detection_count": payload.get("vision_detection_count", 0),
        "vision_class": payload.get("vision_class", "none"),
        "cargo_hs_code": payload.get("cargo_hs_code", "0000.00"),
        "cargo_declared_value": payload.get("cargo_declared_value", 0.0),
        "cargo_weight": payload.get("cargo_weight", 0.0),
        "cargo_volume": payload.get("cargo_volume", 0.0),
        "cargo_category": payload.get("cargo_category", "unknown"),
        "route_origin_risk_index": payload.get("route_origin_risk_index", 1.0),
        "route_transshipment_count": payload.get("route_transshipment_count", 0),
        "route_carrier_history": payload.get("route_carrier_history", 0),
        "intel_ofac_match": payload.get("intel_ofac_match", False),
        "intel_un_conflict_flag": payload.get("intel_un_conflict_flag", False),
        "intel_interpol_alert": payload.get("intel_interpol_alert", False),
        "intel_seasonal_index": payload.get("intel_seasonal_index", 1.0),
    }


def top_features(features: Dict) -> List[Dict]:
    return [
        {"name": "blockchain_trust_score", "importance": 0.41},
        {"name": "vision_confidence", "importance": 0.18},
        {"name": "cargo_declared_value", "importance": 0.12},
        {"name": "route_origin_risk_index", "importance": 0.08},
        {"name": "intel_ofac_match", "importance": 0.05},
    ]
