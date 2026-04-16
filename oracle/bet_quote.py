"""
EIP-712 bet quote signing (must match contracts/src/SportsBetting.sol).
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict

from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3


def _require_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise ValueError(f"{name} is not set")
    return v


def _normalize_pk_hex(pk: str) -> str:
    pk = pk.strip()
    if not pk.startswith("0x"):
        pk = "0x" + pk
    return pk


def read_bettor_nonce(rpc_url: str, contract: str, bettor: str) -> int:
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    abi = [
        {
            "inputs": [{"name": "", "type": "address"}],
            "name": "bettorNonces",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        }
    ]
    c = w3.eth.contract(address=Web3.to_checksum_address(contract), abi=abi)
    return int(c.functions.bettorNonces(Web3.to_checksum_address(bettor)).call())


def _moneyline_odds_x100(odds_payload: Dict[str, Any], bookmakers_csv: str, outcome: int) -> int:
    """outcome: 0 Home, 1 Away, 2 Draw (Solidity enums)."""
    bks = odds_payload.get("bookmakers") or {}
    for bm in bookmakers_csv.split(","):
        bm = bm.strip()
        if not bm:
            continue
        markets = bks.get(bm) or []
        for m in markets:
            name = (m.get("name") or "").lower().strip()
            if not (
                "money" in name
                or name == "ml"
                or "moneyline" in name
                or name == "1x2"
            ):
                continue
            for entry in m.get("odds") or []:
                if entry.get("hdp") is not None and entry.get("hdp") != 0:
                    continue
                raw = None
                if outcome == 0:
                    raw = entry.get("home")
                elif outcome == 1:
                    raw = entry.get("away")
                else:
                    raw = entry.get("draw")
                if not raw:
                    continue
                return int(round(float(raw) * 100))
    raise ValueError("No moneyline odds for this event/bookmakers/outcome")


def sign_bet_quote(
    *,
    bettor: str,
    game_id: str,
    bet_type: int,
    outcome: int,
    line: int,
    odds_x100: int,
    nonce: int,
    expiry: int,
    chain_id: int,
    verifying_contract: str,
    oracle_private_key: str,
) -> str:
    if odds_x100 < 100:
        raise ValueError("odds must be >= 100")

    full_message: Dict[str, Any] = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "BetQuote": [
                {"name": "bettor", "type": "address"},
                {"name": "gameId", "type": "string"},
                {"name": "betType", "type": "uint8"},
                {"name": "outcome", "type": "uint8"},
                {"name": "line", "type": "int256"},
                {"name": "odds", "type": "uint256"},
                {"name": "nonce", "type": "uint256"},
                {"name": "expiry", "type": "uint256"},
            ],
        },
        "primaryType": "BetQuote",
        "domain": {
            "name": "SportsBetting",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": Web3.to_checksum_address(verifying_contract),
        },
        "message": {
            "bettor": Web3.to_checksum_address(bettor),
            "gameId": game_id,
            "betType": bet_type,
            "outcome": outcome,
            "line": line,
            "odds": odds_x100,
            "nonce": nonce,
            "expiry": expiry,
        },
    }

    encoded = encode_typed_data(full_message=full_message)
    pk = _normalize_pk_hex(oracle_private_key)
    signed = Account.sign_message(encoded, private_key=pk)
    return signed.signature.hex()


def build_quote_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """POST /quote JSON body -> { odds, nonce, expiry, signature }."""
    rpc_url = _require_env("RPC_URL")
    contract = _require_env("CONTRACT_ADDRESS")
    oracle_pk = _require_env("ORACLE_PRIVATE_KEY")
    chain_id = int(os.environ.get("NEXT_PUBLIC_CHAIN_ID", "11155111"))

    bettor = data.get("bettor")
    game_id = data.get("gameId")
    bet_type = int(data.get("betType", 0))
    outcome = int(data.get("outcome", 0))
    line = int(data.get("line", 0))
    event_id = data.get("eventId")
    bookmakers = data.get("bookmakers")

    if not bettor or not game_id:
        raise ValueError("bettor and gameId are required")
    if event_id is None or not bookmakers:
        raise ValueError("eventId and bookmakers are required for odds fetch")
    if bet_type != 0:
        raise ValueError("only moneyline (betType=0) supported for now")

    from odds_client import get_client

    with get_client() as client:
        odds_payload = client.get_event_odds(
            event_id=int(event_id), bookmakers=str(bookmakers)
        )
    odds_x100 = _moneyline_odds_x100(odds_payload, str(bookmakers), outcome)

    nonce = read_bettor_nonce(rpc_url, contract, bettor)
    expiry = int(time.time()) + 300

    sig = sign_bet_quote(
        bettor=bettor,
        game_id=str(game_id),
        bet_type=bet_type,
        outcome=outcome,
        line=line,
        odds_x100=odds_x100,
        nonce=nonce,
        expiry=expiry,
        chain_id=chain_id,
        verifying_contract=contract,
        oracle_private_key=oracle_pk,
    )

    return {
        "odds": odds_x100,
        "nonce": nonce,
        "expiry": expiry,
        "signature": sig if sig.startswith("0x") else "0x" + sig,
    }
