#!/usr/bin/env bash
set -e

# Switch to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=========================================================="
echo " [Our Archive] Starting CLI Server on Linux"
echo " User Home: ${HOME}"
echo " Default Storage: ${HOME}/OurArchive"
echo "=========================================================="

# Check node availability
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed or not in PATH."
    exit 1
fi

# Build if client dist does not exist
if [ ! -f "packages/client/dist/index.html" ]; then
    echo "[Our Archive] Building frontend for production..."
    npm run build
fi

echo "[Our Archive] Launching Backend Server..."
npm run start
