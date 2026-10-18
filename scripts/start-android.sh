#!/usr/bin/env bash
set -e

# Switch to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=========================================================="
echo " [Our Archive] Starting on Android (Terminal Emulator)"
echo " Target Storage: /sdcard/OurArchive"
echo "=========================================================="

# Check node availability
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not found."
    echo "If you are using Termux, install Node.js with: pkg install nodejs"
    exit 1
fi

# Check storage permission
if [ ! -d "/sdcard" ] && [ ! -d "/storage/emulated/0" ]; then
    echo "Warning: /sdcard is not accessible."
    echo "In Termux, please execute: termux-setup-storage"
    echo "And grant the storage permission prompt."
fi

# Ensure frontend production build exists
if [ ! -f "packages/client/dist/index.html" ]; then
    echo "[Our Archive] Building frontend for production..."
    npm run build
fi

echo "[Our Archive] Launching Backend Server..."
npm run start
