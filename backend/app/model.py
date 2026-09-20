"""V1 network definition and checkpoint loading.

The architecture is reproduced exactly as trained. The module indices inside
`f` and `h` are part of the contract: they are the keys stored in the
checkpoint's state_dict, so renaming or reordering any layer silently breaks
loading.
"""
import torch
import torch.nn as nn

from .config import N_CHANNELS


class CNN(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.f = nn.Sequential(
            nn.Conv2d(N_CHANNELS, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(128, 192, 3, padding=1), nn.BatchNorm2d(192), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.h = nn.Sequential(nn.Flatten(), nn.Dropout(0.30), nn.Linear(192, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.h(self.f(x)).squeeze(1)


def load_model(checkpoint_path: str) -> tuple[CNN, dict]:
    """Returns the network in eval mode plus the checkpoint's own metadata."""
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

    model = CNN()
    model.load_state_dict(ckpt["model"])
    # eval() matters: Dropout must be off and BatchNorm must use its running
    # statistics. Leaving this out yields a different answer on every call.
    model.eval()

    meta = {
        "epoch": ckpt.get("epoch"),
        "variables": ckpt.get("variables"),
        "training_metrics": ckpt.get("metrics"),
    }
    return model, meta
