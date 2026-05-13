#!/usr/bin/env bash
# Start backend (port 5000) and frontend (port 3000) dev servers in parallel.
# No Docker — just `npm run dev` in each subdirectory.
set -euo pipefail
cd "$(dirname "$0")/.."

cleanup() {
  echo "Stopping dev servers..."
  kill 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "Starting backend (http://localhost:5000)..."
(cd backend && npm run dev) &

echo "Starting frontend (http://localhost:3000)..."
(cd frontend && npm run dev) &

wait
