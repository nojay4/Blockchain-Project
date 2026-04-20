"""
Sports betting API: games and odds.
Run: FLASK_APP=main flask run --port 8000  (or ./run.sh from repo root)
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from odds_client import get_client

# Repo-root .env (Flask cwd is oracle/ when started via run.sh)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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
        return ",".join(response["bookmakers"])


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


@app.route("/quote", methods=["POST"])
def quote():
    """Oracle-signed EIP-712 quote for placeBet (moneyline only)."""
    from bet_quote import build_quote_response

    data = request.get_json(silent=True) or {}
    try:
        out = build_quote_response(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(out)


@app.route("/list-bets", methods=["GET"])
def list_bets():
    from list_bets import get_raw_logs, make_contract, decoded_bets, get_tickets
    logs = get_raw_logs()
    c = make_contract()
    bets = decoded_bets(logs, c)
    tickets = get_tickets(bets)
    return jsonify(tickets)


@app.route("/report-result", methods=["POST"])
def report_result():
    """Oracle submits reportResult after the sports API marks the event settled."""
    from report_result import report_result_for_game

    data = request.get_json(silent=True) or {}
    game_id = data.get("gameId")
    try:
        out = report_result_for_game(game_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify(out)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
