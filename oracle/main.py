"""
Sports betting API: hardcoded games and odds.
Also serves as oracle entrypoint (reportResult to contract later).
Run: FLASK_APP=main flask run --port 8000  (or ./run.sh from repo root)
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
import json
from odds_client import get_client


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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
