#!/usr/bin/env bash
# Keeps the environment alive by pinging the Vite dev server every 30 seconds.
# Prevents Gitpod from stopping the environment due to inactivity.

set -euo pipefail

TARGET="http://localhost:5173"
INTERVAL=30

echo "[keepalive] Starting — pinging ${TARGET} every ${INTERVAL}s"

while true; do
  if curl -sf "${TARGET}" > /dev/null 2>&1; then
    echo "[keepalive] $(date -u '+%Y-%m-%dT%H:%M:%SZ') — OK"
  else
    echo "[keepalive] $(date -u '+%Y-%m-%dT%H:%M:%SZ') — target unreachable, retrying..."
  fi
  sleep "${INTERVAL}"
done
