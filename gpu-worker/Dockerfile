FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    WEIGHTS_DIR=/opt/fashn/weights

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip git ca-certificates libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/worker
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir -r requirements.txt

ARG FASHN_VTON_REF=main
RUN git clone --depth 1 --branch ${FASHN_VTON_REF} https://github.com/fashn-AI/fashn-vton-1.5.git /opt/fashn/source \
    && python3 -m pip install --no-cache-dir /opt/fashn/source \
    && python3 /opt/fashn/source/scripts/download_weights.py --weights-dir ${WEIGHTS_DIR}

COPY handler.py healthcheck.py ./
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 CMD ["python3", "healthcheck.py"]
CMD ["python3", "handler.py"]
