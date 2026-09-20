"""Input normalisation.

This mirrors the training/evaluation path exactly (gpu_train.py and
exact_test.py). Any divergence here — a different fill value, a missing clip —
shifts the input distribution and the probabilities stop meaning what the
reported metrics say they mean.
"""
import numpy as np

from .config import CHANNELS, CLIP, GRID, N_CHANNELS


class PreprocessError(ValueError):
    """Raised for malformed client input; surfaced as HTTP 400."""


def normalise(grid: np.ndarray, stats: dict) -> np.ndarray:
    """Raw [10, 80, 80] physical values -> normalised float32 batch [1, 10, 80, 80].

    Per channel: fill non-finite with the training mean, standardise with the
    training mean/std, then clip to +/-10 sigma.
    """
    if grid.shape != (N_CHANNELS, GRID, GRID):
        raise PreprocessError(
            f"expected shape [{N_CHANNELS}, {GRID}, {GRID}], got {list(grid.shape)}"
        )

    out = np.empty((1, N_CHANNELS, GRID, GRID), dtype=np.float32)

    for j, name in enumerate(CHANNELS):
        if name not in stats:
            raise PreprocessError(f"train_stats.json has no entry for channel '{name}'")
        mean = float(stats[name]["mean"])
        std = float(stats[name]["std"])

        x = np.asarray(grid[j], dtype=np.float32)
        if np.ma.isMaskedArray(grid[j]):
            x = np.ma.asarray(grid[j], dtype=np.float32).filled(mean)
        x = np.nan_to_num(x, nan=mean, posinf=mean, neginf=mean)

        out[0, j] = np.clip((x - mean) / (std + 1e-8), -CLIP, CLIP)

    return out


def parse_grid(payload: object) -> np.ndarray:
    """Validates a JSON-supplied nested array into a numeric ndarray."""
    try:
        arr = np.asarray(payload, dtype=np.float32)
    except (TypeError, ValueError) as exc:
        raise PreprocessError(f"grid is not numeric: {exc}") from exc

    if arr.ndim != 3:
        raise PreprocessError(f"grid must be 3-dimensional, got {arr.ndim} dimensions")
    return arr
