"""Self-healing retrain pipeline for the XGBoost risk model.

PRD §5.3.3:
  - Nightly retrain at 02:00 IST when ≥ 50 new flagged samples queued
  - New model deployed to 10% traffic for 48 h (A/B test)
  - If new model accuracy > current → auto-promote
  - Adversarial spike detection: 15% spike → emergency retrain
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

RETRAIN_THRESHOLD = int(os.getenv("RETRAIN_THRESHOLD", "50"))
SPIKE_THRESHOLD = 0.15  # 15% spike in any class → emergency retrain


def should_retrain(training_queue_count: int) -> bool:
    """Check whether the standard retrain threshold has been reached.

    Args:
        training_queue_count: Number of un-trained flagged samples.

    Returns:
        True if count ≥ RETRAIN_THRESHOLD.
    """
    return training_queue_count >= RETRAIN_THRESHOLD


def detect_adversarial_spike(
    recent_class_counts: Dict[str, int],
    baseline_class_counts: Dict[str, int],
) -> Dict[str, Any]:
    """Detect a ≥ 15% spike in any detection / risk class.

    Args:
        recent_class_counts: Counts from the last 24 h window.
        baseline_class_counts: Counts from the prior 30-day baseline.

    Returns:
        Dict with spike_detected flag and detail.
    """
    spikes = []
    for cls, recent in recent_class_counts.items():
        baseline = baseline_class_counts.get(cls, 0)
        if baseline == 0:
            if recent > 5:
                spikes.append(
                    {"class": cls, "recent": recent, "baseline": baseline, "pct": "inf"}
                )
            continue
        pct_change = (recent - baseline) / baseline
        if pct_change >= SPIKE_THRESHOLD:
            spikes.append(
                {
                    "class": cls,
                    "recent": recent,
                    "baseline": baseline,
                    "pct": round(pct_change * 100, 1),
                }
            )

    return {
        "spike_detected": len(spikes) > 0,
        "emergency_retrain": len(spikes) > 0,
        "spikes": spikes,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


def run_retrain_job(
    queue_count: Optional[int] = None,
    force: bool = False,
) -> Dict[str, Any]:
    """Execute retrain job if conditions are met.

    In the full production system this would:
      1. Query ml_training_queue for untrained rows
      2. Append them to the dataset
      3. Retrain XGBoost
      4. Log new model to MLflow
      5. Deploy to 10% traffic split (A/B)

    For now, this performs an in-process retrain.

    Args:
        queue_count: Override queue count check. If None, defaults to threshold.
        force: Skip threshold check.

    Returns:
        Dict with retrain results.
    """
    if not force and queue_count is not None and queue_count < RETRAIN_THRESHOLD:
        return {
            "status": "skipped",
            "reason": f"Queue count {queue_count} < threshold {RETRAIN_THRESHOLD}",
        }

    try:
        from app.model.train import train_model

        logger.info("Starting scheduled retrain job...")
        results = train_model({"n_samples": 6000, "seed": int(datetime.now().timestamp()) % 10000})

        # Reload the model in predict.py
        from app.model import predict as predict_mod

        predict_mod._model_loaded = False
        predict_mod._model = None

        logger.info(f"Retrain complete: accuracy={results.get('accuracy')}")
        return {
            "status": "retrained",
            "accuracy": results.get("accuracy"),
            "auc_roc": results.get("auc_roc"),
            "model_path": results.get("model_path"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Retrain failed: {e}")
        return {"status": "error", "error": str(e)}
