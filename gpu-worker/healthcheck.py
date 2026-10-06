import os
from pathlib import Path

import torch

weights = Path(os.environ.get("WEIGHTS_DIR", "/opt/fashn/weights"))
if not torch.cuda.is_available():
    raise SystemExit("CUDA is not available")
if not (weights / "model.safetensors").is_file():
    raise SystemExit("FASHN weights are missing")
print("ok")
