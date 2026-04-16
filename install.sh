#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Installing dependencies..."

# --- Web (Next.js) ---
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required. Install it from https://nodejs.org/"
  exit 1
fi
echo "==> Web: npm install in web/"
(cd web && npm install)

# --- Oracle (Python) ---
if command -v python3 &>/dev/null; then
  ORACLE_DIR="$SCRIPT_DIR/oracle"
  VENV_DIR="$ORACLE_DIR/.venv"
  if [[ ! -d "$VENV_DIR" ]]; then
    echo "==> Oracle: creating venv and installing packages"
    python3 -m venv "$VENV_DIR"
  fi
  "$VENV_DIR/bin/pip" install -q -r "$ORACLE_DIR/requirements.txt"
  echo "==> Oracle: dependencies ready"
else
  echo "==> Oracle: skipping (python3 not found)"
fi

# --- Contracts (Foundry) ---
if command -v forge &>/dev/null && [[ -d "$SCRIPT_DIR/contracts" ]]; then
  if [[ ! -d "$SCRIPT_DIR/contracts/lib/forge-std" ]]; then
    echo "==> Contracts: installing forge-std"
    (cd contracts && forge install foundry-rs/forge-std)
  else
    echo "==> Contracts: forge-std already present"
  fi
else
  echo "==> Contracts: skipping (forge not found or no contracts dir)"
fi

echo "==> Done. Run ./run.sh to start the web UI."
