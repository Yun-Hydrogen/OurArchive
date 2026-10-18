#!/usr/bin/env bash
set -e

# Switch to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=========================================================="
echo " [Our Archive] Starting Development Mode on Android"
echo " Target Storage: /sdcard/OurArchive"
echo "=========================================================="

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not found."
    echo "If you are using Termux, install Node.js with: pkg install nodejs"
    exit 1
fi

if [ ! -d "/sdcard" ] && [ ! -d "/storage/emulated/0" ]; then
    echo "Warning: /sdcard is not accessible. Run 'termux-setup-storage' to grant access."
fi

npm run dev
