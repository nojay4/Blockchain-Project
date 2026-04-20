from odds_client import get_client
from dotenv import load_dotenv, find_dotenv
from web3 import Web3
import requests
import json
import os

load_dotenv(find_dotenv())


def get_raw_logs():
    chain_id = os.getenv("NEXT_PUBLIC_CHAIN_ID")
    etherscan_api_key = os.getenv("ETHERSCAN_API_KEY")
    contract_address = os.getenv("CONTRACT_ADDRESS")
    first_block = os.getenv("CONTRACT_DEPLOY_BLOCK")
    resp = requests.get(
        f"https://api.etherscan.io/v2/api?chainid={chain_id}&module=proxy&action=eth_blockNumber&apikey={etherscan_api_key}"
    ).json()
    latest_block_hex = resp["result"]      # e.g. "0xa2d1f3"
    latest_block = int(latest_block_hex, 16)
    response = requests.get(f"https://api.etherscan.io/v2/api?chainid={chain_id}&module=logs&action=getLogs&address={contract_address}&fromBlock={first_block}&toBlock={latest_block}&page=1&offset=100&apikey={etherscan_api_key}")

    return response.json()['result']

def make_contract():
    rpc_url = os.getenv("RPC_URL")
    contract_address = os.getenv("CONTRACT_ADDRESS")
    with open('../contract_abi.json', 'r') as f:
        abi = json.load(f)
    abi = abi['abi']
    w3 = Web3(Web3.HTTPProvider(rpc_url))  # you can also use Web3() just for decode
    c = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)
    return c


def decoded_bets(logs, c, bettor: str = None):
    decoded_bets = []
    bets = []
    for l in logs:
        if not l.get("topics"):
            continue
        try:
            evt = c.events.BetPlaced().process_log({
                "address": Web3.to_checksum_address(l["address"]),
                "topics": l["topics"],
                "data": l["data"],
                "blockNumber": int(l["blockNumber"], 16),
                "transactionHash": l["transactionHash"],
                "transactionIndex": int(l["transactionIndex"], 16),
                "blockHash": l["blockHash"],
                "logIndex": int(l["logIndex"], 16),
            })
            decoded_bets.append(dict(evt["args"]))
        except Exception:
            # not BetPlaced (or decode mismatch), skip
            pass
    if bettor:
        for bet in decoded_bets:
            if bet["bettor"] == bettor:
                bets.append(bet)
        return bets
    return decoded_bets

def get_tickets(bets):
    tickets = {}
    for bet in bets:
        bet_info = {
            "bettor": bet["bettor"],
            "game_id": bet["gameId"],
            "bet_type": bet["betType"],
            "outcome": bet["outcome"],
            "line": bet["line"],
            "amount": bet["amount"],
            "odds": bet["odds"],
        }
        with get_client() as client:
            try:
                event = client.get_event_by_id(bet["gameId"])
            except Exception as e:
                if str(e) == 'Resource not found':
                    continue
                else:
                    raise e
        event_info = {
            "id": event["id"],
            "home_team": event["home"],
            "away_team": event["away"],
            "date": event["date"],
            "sport": event["sport"],
            "league": event["league"],
            "status": event["status"],
            "scores": event["scores"],
        }
        tickets[bet["betId"]] = {
            "bet": bet_info,
            "event": event_info,
        }
    return tickets



    