import base64
import io
import os

import runpod
from PIL import Image
from fashn_vton import TryOnPipeline

WEIGHTS_DIR = os.environ.get("WEIGHTS_DIR", "/opt/fashn/weights")
ALLOWED_CATEGORIES = {"tops", "bottoms", "one-pieces"}
pipeline = TryOnPipeline(weights_dir=WEIGHTS_DIR, device="cuda")


def decode_image(value: str) -> Image.Image:
    if not isinstance(value, str) or not value:
        raise ValueError("image must be a non-empty base64 string")
    encoded = value.split(",", 1)[-1]
    return Image.open(io.BytesIO(base64.b64decode(encoded, validate=True))).convert("RGB")


def handler(job):
    payload = job.get("input") or {}
    category = payload.get("category")
    if category not in ALLOWED_CATEGORIES:
        raise ValueError("category must be tops, bottoms or one-pieces")
    person = decode_image(payload.get("person_image"))
    garment = decode_image(payload.get("garment_image"))
    result = pipeline(person_image=person, garment_image=garment, category=category)
    output = io.BytesIO()
    result.images[0].save(output, format="PNG", optimize=True)
    return {"result_image": base64.b64encode(output.getvalue()).decode("ascii")}


runpod.serverless.start({"handler": handler})
