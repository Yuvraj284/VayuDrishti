# VayuDrishti V1 inference API

Serves the locked CNN v1 checkpoint behind an HTTP endpoint the frontend can call.
Nothing here trains, fine-tunes or rewrites the model — it loads the preserved,
checksum-verified artefact and runs a forward pass.

## Contract

`POST /predict`

```json
{ "grid": [[[...80 floats...] x80] x10], "request_id": "optional" }
```

`grid` is **raw physical values** in the model's channel order. The service applies
the training normalisation itself, so callers must not pre-normalise.

```
precipitation, uwnd, vwnd, ws, nobs, irwin_cdr, irwin_2, irwvp, irwvp_2, vschn
```

Response:

```json
{
  "probability": 0.984518647,
  "prediction": "cyclone",
  "is_cyclone": true,
  "threshold": 0.51,
  "margin": 0.474518647,
  "model_version": "VayuDrishti CNN v1",
  "model_source": "s3://cyclone-12-09-2026/models/v1/best_model.pt",
  "checkpoint_epoch": 18,
  "channels": ["precipitation", "..."],
  "input_shape": [10, 80, 80],
  "inference_ms": 138.66,
  "cold_start_ms": 608.65
}
```

`GET /health` returns the same identity block without running inference.

Errors are `400` for malformed input (`invalid_input`) and `500` for a failed
forward pass (`inference_failed`), both `{"error", "message"}`.

## Correctness notes

- **Channel order is load-bearing.** The network cannot detect a permutation; it
  will return a confident wrong answer. `warm()` compares the configured order
  against the `variables` list recorded inside the checkpoint and refuses to serve
  on a mismatch.
- **Normalisation must match training exactly** — fill non-finite with the training
  mean, standardise, clip to ±10σ. Divergence here invalidates the reported metrics.
- **`model.eval()`** is required: Dropout off, BatchNorm on running statistics.
- **`threshold` is echoed in every response** so no client has to assume it. It must
  stay in step with `THRESHOLD` in `src/data/model.ts` (currently 0.51).

## Local test

```bash
python backend/tests/local_test.py --index 0
```

Run where torch, `test.nc` and the checkpoint are reachable.

## Deploy

```bash
cd backend && sam build && sam deploy --guided
```

Then set the printed `ApiUrl` as `VITE_API_URL` in the frontend.
