FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    python-is-python3 \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY server/requirements.txt server/requirements.txt
RUN python -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir -r server/requirements.txt

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PYTHON_BIN=/opt/venv/bin/python
ENV PYTHONUNBUFFERED=1
ENV OSTIRO_WHISPER_MODEL=base
ENV OSTIRO_WHISPER_DEVICE=cpu
ENV OSTIRO_WHISPER_COMPUTE_TYPE=int8
ENV OSTIRO_TRANSCRIPTION_TIMEOUT_MS=7200000

EXPOSE 8787

CMD ["npm", "start"]
