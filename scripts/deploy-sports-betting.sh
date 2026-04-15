#!/usr/bin/env bash
# Deploy SportsBetting to Sepolia using Foundry.
# Expects in .env (repo root):
#   ORACLE_PRIVATE_KEY  — hex key; used to derive ORACLE_ADDRESS and to broadcast (owner == oracle at deploy time)
#   RPC_URL — HTTPS RPC for Sepolia
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${ORACLE_PRIVATE_KEY:-}" ]]; then
  echo "error: set ORACLE_PRIVATE_KEY in .env (or export it)" >&2
  exit 1
fi

if [[ -z "${RPC_URL:-}" ]]; then
  echo "error: set RPC_URL in repo-root .env" >&2
  exit 1
fi

if ! command -v cast &>/dev/null || ! command -v forge &>/dev/null; then
  echo "error: Foundry (cast, forge) must be on PATH" >&2
  exit 1
fi

export ORACLE_ADDRESS
ORACLE_ADDRESS="$(cast wallet address --private-key "$ORACLE_PRIVATE_KEY")"

echo "Using oracle address: $ORACLE_ADDRESS"
echo "Deploying from same key (contract owner will match this address)..."

cd contracts

forge script script/DeploySportsBetting.s.sol:DeploySportsBetting \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$ORACLE_PRIVATE_KEY"

echo "Done. Update CONTRACT_ADDRESS in .env from the forge output above."
