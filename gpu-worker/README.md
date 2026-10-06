# FASHN VTON 1.5 RunPod worker

Prepared, but not provisioned or deployed. The image packages the Apache-2.0 `fashn-AI/fashn-vton-1.5` inference pipeline and exposes it through a RunPod Serverless handler.

## Contract

Input:

```json
{"input":{"person_image":"<base64>","garment_image":"<base64>","category":"tops"}}
```

Output:

```json
{"result_image":"<base64 PNG>"}
```

Categories are limited to `tops`, `bottoms`, and `one-pieces`. The ArmarioDigital backend sends private image bytes as base64, polls the asynchronous job, and stores the result back in private storage. The RunPod API key is never used by browser code.

## Build and deploy later

```bash
docker build -t armario-fashn-vton:1.5 gpu-worker
```

Publish that image to a registry, create a RunPod Serverless endpoint, then set only on the Hetzner backend:

```dotenv
AI_TRYON_ENABLED=true
RUNPOD_API_KEY=...
RUNPOD_ENDPOINT_ID=...
```

The model weights are downloaded at image build time. Pin `FASHN_VTON_REF` to a reviewed upstream tag or commit before production rollout.
