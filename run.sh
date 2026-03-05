#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install deps if needed
if [[ ! -d "web/node_modules" ]]; then
  echo "==> web/node_modules not found, running install.sh..."
  "$SCRIPT_DIR/install.sh"
fi

# Start backend (Flask API) in background
BACKEND_PID=""
VENV_DIR="$SCRIPT_DIR/oracle/.venv"
if [[ -x "$VENV_DIR/bin/flask" ]]; then
  echo "==> Starting backend at http://localhost:8000"
  (cd "$SCRIPT_DIR/oracle" && FLASK_APP=main "$VENV_DIR/bin/flask" run --port 8000) &
  BACKEND_PID=$!
  trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
else
  echo "==> Backend venv not found. Run ./install.sh first to enable the API."
fi

echo "==> Starting web UI at http://localhost:3000"
(cd web && npm run dev)
