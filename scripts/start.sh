#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

# Detect if running under Android (Termux)
if [ -n "$TERMUX_VERSION" ] || [ -d "/sdcard" ]; then
    if [ ! -w "/sdcard" ] 2>/dev/null; then
        echo "[Our Archive] Tip for Android: Ensure storage access is granted (e.g. run 'termux-setup-storage')."
    fi
fi

if [ ! -f "packages/client/dist/index.html" ]; then
    echo "[Our Archive] Building frontend for first run..."
    npm run build
fi

echo "[Our Archive] Launching Backend Server..."
npm run start
