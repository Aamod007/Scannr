"""Model drift detection using statistical tests.

PRD §Phase 5:
  - Detect feature distribution drift on vision + risk model inputs
  - Alert when drift exceeds threshold
  - Uses Kolmogorov-Smirnov test and Population Stability Index (PSI)
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

import numpy as np

logger = logging.getLogger(__name__)

# Configurable thresholds
KS_THRESHOLD = 0.05   # p-value below this → drift detected
PSI_THRESHOLD = 0.20  # PSI above this → significant drift

# In-memory baseline distributions (populated on first call or via /baseline)
_baseline: Dict[str, np.ndarray] = {}
_recent: Dict[str, np.ndarray] = {}


def _calculate_psi(expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
    """Calculate Population Stability Index between two distributions."""
    eps = 1e-6
    breakpoints = np.linspace(min(expected.min(), actual.min()),
                              max(expected.max(), actual.max()),
                              buckets + 1)
    expected_counts = np.histogram(expected, bins=breakpoints)[0] / len(expected) + eps
    actual_counts = np.histogram(actual, bins=breakpoints)[0] / len(actual) + eps
    psi = np.sum((actual_counts - expected_counts) * np.log(actual_counts / expected_counts))
    return float(psi)


def set_baseline(features: Dict[str, List[float]]) -> Dict[str, Any]:
    """Set baseline feature distributions for drift comparison.

    Args:
        features: Dict mapping feature name → list of values.

    Returns:
        Confirmation with statistics.
    """
    global _baseline
    stats = {}
    for name, values in features.items():
        arr = np.array(values, dtype=np.float64)
        _baseline[name] = arr
        stats[name] = {"mean": float(arr.mean()), "std": float(arr.std()), "n": len(arr)}
    return {"status": "baseline_set", "features": stats}


def set_recent(features: Dict[str, List[float]]) -> None:
    """Set recent feature distributions for drift comparison."""
    global _recent
    for name, values in features.items():
        _recent[name] = np.array(values, dtype=np.float64)


def detect_drift(
    recent_features: Optional[Dict[str, List[float]]] = None,
) -> Dict[str, Any]:
    """Run drift detection across all tracked features.

    Args:
        recent_features: Optional new recent data. If None, uses synthetic demo data.

    Returns:
        Drift report with per-feature KS test results and PSI.
    """
    global _recent

    # If no baseline yet, generate synthetic demo baseline
    if not _baseline:
        rng = np.random.RandomState(42)
        _baseline["blockchain_trust_score"] = rng.normal(70, 15, 500)
        _baseline["vision_confidence"] = rng.uniform(0, 1, 500)
        _baseline["cargo_declared_value_log"] = rng.normal(14, 2, 500)
        _baseline["route_origin_risk_index"] = rng.uniform(0, 10, 500)
        _baseline["risk_score"] = rng.normal(30, 20, 500)

    # Set recent data if provided
    if recent_features:
        set_recent(recent_features)

    # If no recent data, generate slightly shifted synthetic data
    if not _recent:
        rng = np.random.RandomState(99)
        _recent["blockchain_trust_score"] = rng.normal(68, 16, 200)
        _recent["vision_confidence"] = rng.uniform(0, 1, 200)
        _recent["cargo_declared_value_log"] = rng.normal(14.2, 2.1, 200)
        _recent["route_origin_risk_index"] = rng.uniform(0, 10, 200)
        _recent["risk_score"] = rng.normal(32, 22, 200)

    from scipy.stats import ks_2samp

    feature_reports = {}
    any_drift = False

    for name in _baseline:
        if name not in _recent:
            continue

        baseline_arr = _baseline[name]
        recent_arr = _recent[name]

        # Kolmogorov-Smirnov test
        ks_stat, ks_p = ks_2samp(baseline_arr, recent_arr)
        ks_drift = bool(ks_p < KS_THRESHOLD)

        # PSI
        psi = _calculate_psi(baseline_arr, recent_arr)
        psi_drift = bool(psi > PSI_THRESHOLD)

        drift_detected = ks_drift or psi_drift
        if drift_detected:
            any_drift = True

        feature_reports[name] = {
            "ks_statistic": round(float(ks_stat), 4),
            "ks_p_value": round(float(ks_p), 4),
            "ks_drift": ks_drift,
            "psi": round(float(psi), 4),
            "psi_drift": psi_drift,
            "drift_detected": drift_detected,
            "baseline_mean": round(float(baseline_arr.mean()), 4),
            "recent_mean": round(float(recent_arr.mean()), 4),
            "baseline_std": round(float(baseline_arr.std()), 4),
            "recent_std": round(float(recent_arr.std()), 4),
        }

    return {
        "drift_detected": any_drift,
        "feature_reports": feature_reports,
        "ks_threshold": KS_THRESHOLD,
        "psi_threshold": PSI_THRESHOLD,
        "alert": any_drift,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
