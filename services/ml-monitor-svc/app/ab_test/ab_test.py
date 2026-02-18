def ab_compare():
    """Compare A/B test results between models."""
    return {
        "model_a": {
            "version": "v1.0.0",
            "traffic_percentage": 90,
            "accuracy": 0.92,
            "f1_score": 0.91,
            "latency_ms": 150,
        },
        "model_b": {
            "version": "v1.1.0",
            "traffic_percentage": 10,
            "accuracy": 0.94,
            "f1_score": 0.93,
            "latency_ms": 145,
        },
        "winner": "model_b",
        "promote": True,
        "recommendation": "promote_model_b",
    }
