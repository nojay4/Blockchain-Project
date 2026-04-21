"""
Fetch final scores from the sports API and submit `reportResult` on-chain (oracle key).
"""
from __future__ import annotations

import os
from typing import Any, Dict, Tuple

from eth_account import Account
from web3 import Web3
from web3.contract import Contract

from bet_quote import _normalize_pk_hex, _require_env
from list_bets import make_contract
from odds_client import get_client

# SportsBetting.GameStatus
GAME_OPEN = 0
GAME_SETTLED = 1

# SportsBetting.Outcome
OUTCOME_HOME = 0
OUTCOME_AWAY = 1
OUTCOME_DRAW = 2


def _scores_to_chain_x10(scores: Dict[str, Any]) -> Tuple[int, int]:
    raw_h = scores.get("home")
    raw_a = scores.get("away")
    if raw_h is None or raw_a is None:
        raise ValueError("Event has no final scores")
    return int(round(float(raw_h) * 10)), int(round(float(raw_a) * 10))


def _moneyline_result(home_x10: int, away_x10: int) -> int:
    if home_x10 > away_x10:
        return OUTCOME_HOME
    if away_x10 > home_x10:
        return OUTCOME_AWAY
    return OUTCOME_DRAW


def _oracle_account() -> Account:
    pk = _normalize_pk_hex(_require_env("ORACLE_PRIVATE_KEY"))
    return Account.from_key(pk)


def report_result_for_game(game_id: str | None) -> Dict[str, Any]:
    """
    If the game is already settled on-chain, returns { alreadySettled: True }.
    Otherwise requires the sports API event to be settled, then sends reportResult.
    """
    if game_id is None:
        raise ValueError("gameId is required")
    game_id = str(game_id).strip()
    if not game_id:
        raise ValueError("gameId is required")

    rpc_url = _require_env("RPC_URL")
    chain_id = int(os.environ.get("NEXT_PUBLIC_CHAIN_ID", "11155111"))

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise RuntimeError("RPC_URL is not reachable")

    c: Contract = make_contract()
    oracle_on_chain = c.functions.oracle().call()
    game = c.functions.getGame(game_id).call()
    status, _result, _hs, _as, exists = game
    if not exists:
        raise ValueError("Game does not exist on-chain (no bets placed for this id?)")

    if int(status) == GAME_SETTLED:
        return {"alreadySettled": True, "gameId": game_id}

    with get_client() as client:
        lookup_id: Any = int(game_id) if game_id.isdigit() else game_id
        event = client.get_event_by_id(lookup_id)

    if (event.get("status") or "").lower() != "settled":
        raise ValueError("Game not final in sports API yet (status must be settled)")

    scores = event.get("scores") or {}
    home_x10, away_x10 = _scores_to_chain_x10(scores)
    outcome = _moneyline_result(home_x10, away_x10)

    acct = _oracle_account()
    oracle_addr = Web3.to_checksum_address(acct.address)
    if Web3.to_checksum_address(oracle_on_chain) != oracle_addr:
        raise RuntimeError(
            "ORACLE_PRIVATE_KEY address does not match contract oracle(); fix deploy or env"
        )

    fn = c.functions.reportResult(game_id, outcome, home_x10, away_x10)
    try:
        gas = int(fn.estimate_gas({"from": oracle_addr}))
    except Exception as e:
        raise RuntimeError(f"reportResult simulation failed: {e}") from e

    nonce = w3.eth.get_transaction_count(oracle_addr, "pending")
    tx = fn.build_transaction(
        {
            "from": oracle_addr,
            "nonce": nonce,
            "gas": min(max(gas, 120_000), 500_000),
            "gasPrice": int(w3.eth.gas_price),
            "chainId": chain_id,
        }
    )

    signed = acct.sign_transaction(tx)
    raw = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction")
    if raw is None:
        raise RuntimeError("Signed transaction has no raw bytes")
    tx_hash = w3.eth.send_raw_transaction(raw)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
    if receipt.get("status") != 1:
        raise RuntimeError(f"Transaction reverted: {tx_hash.hex()}")

    return {
        "gameId": game_id,
        "txHash": Web3.to_hex(tx_hash),
        "alreadySettled": False,
    }
