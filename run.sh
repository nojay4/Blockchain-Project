#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WITH_ORACLE=false
for arg in "$@"; do
  if [[ "$arg" == "--with-oracle" ]]; then
    WITH_ORACLE=true
    break
  fi
done

# Install deps if needed
if [[ ! -d "web/node_modules" ]]; then
  echo "==> web/node_modules not found, running install.sh..."
  "$SCRIPT_DIR/install.sh"
fi

# Optional: start oracle in background
ORACLE_PID=""
if [[ "$WITH_ORACLE" == true ]]; then
  VENV_DIR="$SCRIPT_DIR/oracle/.venv"
  if [[ -x "$VENV_DIR/bin/python" ]]; then
    echo "==> Starting oracle in background..."
    "$VENV_DIR/bin/python" "$SCRIPT_DIR/oracle/main.py" &
    ORACLE_PID=$!
    trap "kill $ORACLE_PID 2>/dev/null || true" EXIT
  else
    echo "==> Oracle venv not found. Run ./install.sh first, or start oracle manually."
  fi
fi

echo "==> Starting web UI at http://localhost:3000"
(cd web && npm run dev)
