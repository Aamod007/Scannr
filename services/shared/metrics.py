"""
Prometheus metrics exporter for SCANNR Python microservices.

Drop-in module: import and call `setup_metrics(app)` to add a /metrics endpoint
that Prometheus can scrape. Automatically tracks request counts, latencies,
and exposes custom gauges per service.

Usage:
    from app.metrics import setup_metrics
    setup_metrics(app, service_name="api-gateway")
"""

import time
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route

# ── Counters & Histograms (in-memory, no external deps) ──
_metrics = {
    "requests_total": 0,
    "requests_success": 0,
    "requests_error": 0,
    "latency_sum": 0.0,
    "latency_count": 0,
}

_custom_gauges = {}


def inc(metric_name: str, value: int = 1):
    """Increment a counter metric."""
    _metrics[metric_name] = _metrics.get(metric_name, 0) + value


def set_gauge(name: str, value: float):
    """Set a gauge metric."""
    _custom_gauges[name] = value


async def _metrics_endpoint(request: Request) -> Response:
    """Prometheus-compatible /metrics endpoint."""
    service = _metrics.get("_service_name", "scannr_service")
    lines = []

    # Request counters
    lines.append(f"# HELP {service}_http_requests_total Total HTTP requests")
    lines.append(f"# TYPE {service}_http_requests_total counter")
    lines.append(f'{service}_http_requests_total {_metrics["requests_total"]}')

    lines.append(f"# HELP {service}_http_requests_success Successful HTTP requests")
    lines.append(f"# TYPE {service}_http_requests_success counter")
    lines.append(f'{service}_http_requests_success {_metrics["requests_success"]}')

    lines.append(f"# HELP {service}_http_requests_error Failed HTTP requests")
    lines.append(f"# TYPE {service}_http_requests_error counter")
    lines.append(f'{service}_http_requests_error {_metrics["requests_error"]}')

    # Latency
    avg_latency = (
        _metrics["latency_sum"] / max(_metrics["latency_count"], 1)
    )
    lines.append(f"# HELP {service}_http_latency_avg_seconds Average request latency")
    lines.append(f"# TYPE {service}_http_latency_avg_seconds gauge")
    lines.append(f"{service}_http_latency_avg_seconds {avg_latency:.6f}")

    # Custom gauges
    for name, value in _custom_gauges.items():
        safe_name = f"{service}_{name}"
        lines.append(f"# HELP {safe_name} Custom gauge")
        lines.append(f"# TYPE {safe_name} gauge")
        lines.append(f"{safe_name} {value}")

    # Process uptime
    lines.append(f"# HELP {service}_uptime_seconds Process uptime")
    lines.append(f"# TYPE {service}_uptime_seconds gauge")
    lines.append(f"{service}_uptime_seconds {time.time() - _metrics.get('_start_time', time.time()):.0f}")

    lines.append("")
    return Response(
        content="\n".join(lines),
        media_type="text/plain",
    )


def get_metrics_route() -> Route:
    """Return a Starlette Route for /metrics."""
    return Route("/metrics", _metrics_endpoint, methods=["GET"])


def setup_metrics(app, service_name: str = "scannr"):
    """
    Register metrics middleware and /metrics endpoint on a Starlette app.

    For Starlette apps that build routes at construction time, call this
    after app creation and add get_metrics_route() to your routes list.
    """
    _metrics["_service_name"] = service_name.replace("-", "_")
    _metrics["_start_time"] = time.time()

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        _metrics["requests_total"] += 1
        start = time.time()
        try:
            response = await call_next(request)
            if response.status_code < 400:
                _metrics["requests_success"] += 1
            else:
                _metrics["requests_error"] += 1
            return response
        except Exception:
            _metrics["requests_error"] += 1
            raise
        finally:
            elapsed = time.time() - start
            _metrics["latency_sum"] += elapsed
            _metrics["latency_count"] += 1
