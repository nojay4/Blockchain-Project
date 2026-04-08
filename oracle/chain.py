"""
Sepolia SportsBetting contract: createGame via oracle key.
Env: SEPOLIA_RPC_URL, SPORTS_BETTING_ADDRESS, ORACLE_PRIVATE_KEY
"""
import os
from typing import Any

from dotenv import load_dotenv
from web3 import Web3
from web3.exceptions import ContractLogicError

load_dotenv()

# Minimal ABI for createGame(string gameId)
SPORTS_BETTING_ABI: list[dict[str, Any]] = [
    {
        "inputs": [{"internalType": "string", "name": "gameId", "type": "string"}],
        "name": "createGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

RPC_URL = os.environ.get("RPC_URL")
CONTRACT_ADDRESS = os.environ.get("CONTRACT_ADDRESS")
ORACLE_KEY = os.environ.get("ORACLE_PRIVATE_KEY", "")


def chain_configured() -> bool:
    return bool(RPC_URL and CONTRACT_ADDRESS and ORACLE_KEY)


def _require_config() -> None:
    if not chain_configured():
        missing = []
        if not RPC_URL:
            missing.append("SEPOLIA_RPC_URL (or ETH_RPC_URL)")
        if not CONTRACT_ADDRESS:
            missing.append("SPORTS_BETTING_ADDRESS")
        if not ORACLE_KEY:
            missing.append("ORACLE_PRIVATE_KEY")
        raise RuntimeError("Chain not configured: set " + ", ".join(missing))


def create_game_on_chain(game_id: str) -> str:
    """
    Submit createGame(gameId). Returns transaction hash (hex string).
    Raises RuntimeError for config or business logic; ValueError for invalid input.
    """
    _require_config()
    if not game_id or not str(game_id).strip():
        raise ValueError("gameId must be non-empty")

    game_id = str(game_id).strip()
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        raise RuntimeError("Could not connect to RPC")

    account = w3.eth.account.from_key(ORACLE_KEY)
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=SPORTS_BETTING_ABI,
    )
    fn = contract.functions.createGame(game_id)

    try:
        fn.estimate_gas({"from": account.address})
    except ContractLogicError as e:
        raise RuntimeError(str(e) or "Contract reverted (e.g. game already exists)") from e

    nonce = w3.eth.get_transaction_count(account.address, "pending")
    chain_id = w3.eth.chain_id

    tx: dict[str, Any] = fn.build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": chain_id,
        }
    )

    gas = fn.estimate_gas({"from": account.address})
    tx["gas"] = int(gas * 1.2)

    latest = w3.eth.get_block("latest")
    base_fee = latest.get("baseFeePerGas")
    if base_fee is not None:
        priority = w3.eth.max_priority_fee
        tx["maxPriorityFeePerGas"] = priority
        tx["maxFeePerGas"] = int(base_fee * 2 + priority)
    else:
        tx["gasPrice"] = w3.eth.gas_price

    signed = w3.eth.account.sign_transaction(tx, ORACLE_KEY)
    raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction
    tx_hash = w3.eth.send_raw_transaction(raw)
    return w3.to_hex(tx_hash)
