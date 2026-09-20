"""Lambda entry point.

Accepts either an API Gateway HTTP API (payload v2.0) event or a direct
invocation, and returns the shape the VayuDrishti Predict page consumes.

Routes
  GET  /health   liveness plus the served model's identity
  POST /predict  one [10, 80, 80] sample
"""
import json
import logging
import os
from typing import Any

from . import config
from .inference import predict, warm
from .preprocess import PreprocessError, parse_grid

log = logging.getLogger()
log.setLevel(logging.INFO)

# The frontend is a browser client, so without this the fetch fails before it
# ever reaches the model. Set to the exact deployed origin, never a wildcard.
CORS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOW_ORIGIN", "http://localhost:5173"),
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}


def _response(status: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json", **CORS},
        "body": json.dumps(body),
    }


def _route(event: dict[str, Any]) -> tuple[str, str]:
    ctx = event.get("requestContext", {}).get("http", {})
    return ctx.get("method", "POST").upper(), ctx.get("path", "/predict")


def _body(event: dict[str, Any]) -> dict[str, Any]:
    raw = event.get("body")
    if raw is None:
        # Direct invocation: the event itself is the payload.
        return {k: v for k, v in event.items() if k != "requestContext"}
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError as exc:
        raise PreprocessError(f"body is not valid JSON: {exc}") from exc


def lambda_handler(event: dict[str, Any], _context: Any = None) -> dict[str, Any]:
    method, path = _route(event)

    if method == "OPTIONS":
        return _response(204, {})

    if path.endswith("/health"):
        try:
            warm()
            return _response(200, {
                "status": "ok",
                "model_version": config.MODEL_VERSION,
                "model_source": f"s3://{config.MODEL_BUCKET}/{config.MODEL_KEY}",
                "threshold": config.THRESHOLD,
                "channels": list(config.CHANNELS),
                "input_shape": [config.N_CHANNELS, config.GRID, config.GRID],
            })
        except Exception as exc:  # noqa: BLE001 - health must report, not raise
            log.exception("health check failed")
            return _response(503, {"status": "unavailable", "error": str(exc)})

    try:
        body = _body(event)
        if "grid" not in body:
            raise PreprocessError(
                "missing 'grid': expected a [10, 80, 80] array of raw physical values"
            )

        grid = parse_grid(body["grid"])
        result = predict(grid)

        # Echoed back so a caller can correlate a response with its request.
        if "request_id" in body:
            result["request_id"] = body["request_id"]

        log.info("prediction p=%.6f class=%s", result["probability"], result["prediction"])
        return _response(200, result)

    except PreprocessError as exc:
        return _response(400, {"error": "invalid_input", "message": str(exc)})
    except Exception as exc:  # noqa: BLE001
        log.exception("inference failed")
        return _response(500, {"error": "inference_failed", "message": str(exc)})
