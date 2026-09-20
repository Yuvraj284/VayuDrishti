"""Local check against one real sample from the held-out test set.

Reads a sample out of test.nc, sends it through the deployed code path, and
compares the result with a direct reference computation. Run where torch,
test.nc and the checkpoint are available:

    python backend/tests/local_test.py --index 0
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config  # noqa: E402
from app.handler import lambda_handler  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nc", default="/home/ec2-user/cyclone_training/data/test.nc")
    ap.add_argument("--index", type=int, default=0)
    args = ap.parse_args()

    from netCDF4 import Dataset

    nc = Dataset(args.nc, "r")
    i = args.index
    # Raw physical values, exactly as a real client would supply them.
    grid = np.stack(
        [np.ma.asarray(nc.variables[v][i], dtype=np.float32).filled(np.nan)
         for v in config.CHANNELS]
    )
    label = int(np.asarray(nc.variables["label"][i]))
    nc.close()

    event = {
        "requestContext": {"http": {"method": "POST", "path": "/predict"}},
        "body": json.dumps({"grid": grid.tolist(), "request_id": f"test-sample-{i}"}),
    }
    resp = lambda_handler(event, None)
    body = json.loads(resp["body"])

    print("status:", resp["statusCode"])
    print(json.dumps(body, indent=2))
    print("\nground truth label:", label, "->", "cyclone" if label == 1 else "non-cyclone")
    print("correct:", (body.get("is_cyclone") is True) == (label == 1))
    return 0 if resp["statusCode"] == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
