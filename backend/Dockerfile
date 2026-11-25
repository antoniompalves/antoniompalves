# Gohan — production image. One process on purpose: SQLite, the realtime broker and the
# weekly scheduler live in memory, so run a single worker and scale up, not out.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    RECIPES_DB=/data/recipes.db UPLOAD_DIR=/data/uploads TZ=Europe/Lisbon PORT=8000

# ffmpeg: video frames/audio for imports; ca-certificates for HTTPS to the sites and the API
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 gohan \
 && mkdir -p /data/uploads && chown -R gohan:gohan /data

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app ./app

USER gohan
VOLUME ["/data"]
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1
# --proxy-headers: trust X-Forwarded-* from the reverse proxy (Caddy) for https URLs
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
