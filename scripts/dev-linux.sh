#!/usr/bin/env bash
set -e

# Switch to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=========================================================="
echo " [Our Archive] Starting Development Mode on Linux"
echo " User Home: ${HOME}"
echo " Default Storage: ${HOME}/OurArchive"
echo "=========================================================="

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed or not in PATH."
    exit 1
fi

npm run dev
