"""
Sports betting API: hardcoded games and odds.
Oracle entrypoint: POST /contract/create-game (needs SEPOLIA_RPC_URL or ETH_RPC_URL,
SPORTS_BETTING_ADDRESS, ORACLE_PRIVATE_KEY in env).
Run: FLASK_APP=main flask run --port 8000  (or ./run.sh from repo root)
"""
from flask import Flask, jsonify, request
from flask_cors import CORS

from odds_client import get_client
from chain import chain_configured, create_game_on_chain


app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/sports")
def get_sports():
    with get_client() as client:
        return jsonify(client.get_sports())

@app.route("/bookmakers")
def get_bookmakers():
    with get_client() as client:
        response = client.get_selected_bookmakers()
        return ','.join(response["bookmakers"])


@app.route("/leagues/<sport>")
def get_leagues(sport: str):
    with get_client() as client:
        return jsonify(client.get_leagues(sport))

@app.route("/events/<sport>")
@app.route("/events/<sport>/<league>")
def get_events(sport: str, league: str = None):
    with get_client() as client:
        return jsonify(client.get_events(sport=sport, league=league))

@app.route("/odds/<event_id>/<bookmakers>")
def get_odds(event_id: int, bookmakers: str):
    with get_client() as client:
        return jsonify(client.get_event_odds(event_id=event_id, bookmakers=bookmakers))

@app.route("/live-events/<sport>")
def get_live_events(sport: str):
    with get_client() as client:
        return jsonify(client.get_live_events(sport))


@app.route("/contract/create-game", methods=["POST"])
def contract_create_game():
    """
    Body JSON: { "eventId": number } — registers str(eventId) on-chain via oracle key.
    """
    if not chain_configured():
        return jsonify(
            {
                "ok": False,
                "error": "Chain not configured (SEPOLIA_RPC_URL, SPORTS_BETTING_ADDRESS, ORACLE_PRIVATE_KEY)",
            }
        ), 503

    payload = request.get_json(silent=True) or {}
    event_id = payload.get("eventId")
    if event_id is None:
        return jsonify({"ok": False, "error": "Missing eventId"}), 400
    try:
        eid = int(event_id)
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "eventId must be an integer"}), 400

    game_id = str(eid)
    try:
        tx_hash = create_game_on_chain(game_id)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    return jsonify(
        {
            "ok": True,
            "gameId": game_id,
            "txHash": tx_hash,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
