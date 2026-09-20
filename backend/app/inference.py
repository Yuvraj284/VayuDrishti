"""Model lifecycle and the single-sample prediction call.

The checkpoint and normalisation statistics are fetched from S3 once per
execution environment and then held in module scope, so only a cold start pays
the download and load cost.
"""
import json
import os
import time
from typing import Any

import numpy as np
import torch

from . import config
from .model import load_model
from .preprocess import normalise

_model = None
_meta: dict[str, Any] = {}
_stats: dict[str, Any] = {}
_loaded_at: float | None = None


def _download(bucket: str, key: str, dest: str) -> str:
    """Fetches an object to the local cache unless it is already there."""
    if os.path.exists(dest):
        return dest
    import boto3  # imported lazily so unit tests can run without AWS

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    boto3.client("s3").download_file(bucket, key, dest)
    return dest


def warm() -> None:
    """Loads the checkpoint and statistics if this container has not yet."""
    global _model, _meta, _stats, _loaded_at
    if _model is not None:
        return

    t0 = time.perf_counter()

    model_path = _download(
        config.MODEL_BUCKET, config.MODEL_KEY,
        os.path.join(config.CACHE_DIR, os.path.basename(config.MODEL_KEY)),
    )
    stats_path = _download(
        config.MODEL_BUCKET, config.STATS_KEY,
        os.path.join(config.CACHE_DIR, os.path.basename(config.STATS_KEY)),
    )

    _model, _meta = load_model(model_path)
    with open(stats_path) as fh:
        _stats = json.load(fh)["variables"]

    # The checkpoint records the channel order it was trained with. If it
    # disagrees with our config the request must fail loudly rather than return
    # a confident answer computed on permuted channels.
    trained = _meta.get("variables")
    if trained and list(trained) != list(config.CHANNELS):
        raise RuntimeError(
            f"channel order mismatch: checkpoint {list(trained)} != config {list(config.CHANNELS)}"
        )

    _loaded_at = time.perf_counter() - t0


def predict(grid: np.ndarray) -> dict[str, Any]:
    """Runs one [10, 80, 80] sample and returns the full decision record."""
    warm()

    t0 = time.perf_counter()
    x = normalise(grid, _stats)

    with torch.no_grad():
        logit = _model(torch.from_numpy(x))
        probability = float(torch.sigmoid(logit).item())

    is_cyclone = probability >= config.THRESHOLD

    return {
        "probability": probability,
        "prediction": "cyclone" if is_cyclone else "non-cyclone",
        "is_cyclone": is_cyclone,
        "threshold": config.THRESHOLD,
        "margin": probability - config.THRESHOLD,
        "model_version": config.MODEL_VERSION,
        "model_source": f"s3://{config.MODEL_BUCKET}/{config.MODEL_KEY}",
        "checkpoint_epoch": _meta.get("epoch"),
        "channels": list(config.CHANNELS),
        "input_shape": [config.N_CHANNELS, config.GRID, config.GRID],
        "inference_ms": round((time.perf_counter() - t0) * 1000, 2),
        "cold_start_ms": round(_loaded_at * 1000, 2) if _loaded_at is not None else None,
    }
