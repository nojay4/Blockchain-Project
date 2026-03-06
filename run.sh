#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_PORT=8000
FRONTEND_PORT=3000
BACKEND_PID=""
CLEANUP_DONE=0

# Kill any process listening on a given port (macOS/Linux)
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null) || true
  if [[ -n "$pids" ]]; then
    echo "==> Stopping process(es) on port $port (PIDs: $pids)"
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

# Tear down backend and frontend (ports 8000 and 3000)
cleanup() {
  if [[ "$CLEANUP_DONE" -eq 1 ]]; then
    return
  fi
  CLEANUP_DONE=1
  echo ""
  echo "==> Shutting down..."
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"
  echo "==> Cleanup done."
  exit 0
}

# Run cleanup on Ctrl+C (SIGINT), SIGTERM, and normal exit
trap cleanup SIGINT SIGTERM EXIT

# On start: free ports if something is already using them
echo "==> Checking ports $BACKEND_PORT and $FRONTEND_PORT..."
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"
sleep 1

# Install deps if needed
if [[ ! -d "web/node_modules" ]]; then
  echo "==> web/node_modules not found, running install.sh..."
  "$SCRIPT_DIR/install.sh"
fi

# Start backend (Flask API) in background
VENV_DIR="$SCRIPT_DIR/oracle/.venv"
if [[ -x "$VENV_DIR/bin/flask" ]]; then
  echo "==> Starting backend at http://localhost:$BACKEND_PORT"
  (cd "$SCRIPT_DIR/oracle" && FLASK_APP=main "$VENV_DIR/bin/flask" run --port "$BACKEND_PORT") &
  BACKEND_PID=$!
else
  echo "==> Backend venv not found. Run ./install.sh first to enable the API."
fi

echo "==> Starting web UI at http://localhost:$FRONTEND_PORT"
# Frontend runs in foreground so logs are visible; Ctrl+C will trigger cleanup
(cd web && npm run dev)
