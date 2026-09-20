"""Runtime configuration. Everything is overridable by environment variable so
the same image can serve a different checkpoint without a rebuild."""
import os

# --- artefact locations (the preserved, checksum-verified V1 copies) ---------
MODEL_BUCKET = os.environ.get("MODEL_BUCKET", "cyclone-12-09-2026")
MODEL_KEY = os.environ.get("MODEL_KEY", "models/v1/best_model.pt")
STATS_KEY = os.environ.get("STATS_KEY", "processed/normalization/train_stats.json")

# --- decision threshold -----------------------------------------------------
# 0.51 is the F1-optimal operating point on the validation split and the value
# stored inside the checkpoint. It must stay in step with THRESHOLD in
# src/data/model.ts; the response echoes it so a client can never assume.
THRESHOLD = float(os.environ.get("THRESHOLD", "0.51"))

# --- model contract ---------------------------------------------------------
# Channel order is load-bearing: the network has no way to detect a permutation,
# it will simply return a confident wrong answer. This is the order used to
# build train.nc/validation.nc/test.nc and to compute train_stats.json.
CHANNELS = [
    "precipitation", "uwnd", "vwnd", "ws", "nobs",
    "irwin_cdr", "irwin_2", "irwvp", "irwvp_2", "vschn",
]
N_CHANNELS = len(CHANNELS)
GRID = 80
CLIP = 10.0

MODEL_VERSION = os.environ.get("MODEL_VERSION", "VayuDrishti CNN v1")

# Local cache path inside the Lambda execution environment. /tmp survives for
# the life of the container, so warm invocations skip the S3 fetch entirely.
CACHE_DIR = os.environ.get("CACHE_DIR", "/tmp/vayudrishti")
