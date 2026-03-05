"""
Sports betting API: hardcoded games and odds.
Also serves as oracle entrypoint (reportResult to contract later).
Run: FLASK_APP=main flask run --port 8000  (or ./run.sh from repo root)
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Hardcoded games (id, teams, start_time, status, odds)
GAMES = [
    {
        "id": "game-1",
        "home_team": "Eagles",
        "away_team": "Hawks",
        "start_time": "2025-03-15T19:00:00Z",
        "status": "upcoming",
        "odds": {"home_win": 2.10, "away_win": 3.50, "draw": 3.20},
    },
    {
        "id": "game-2",
        "home_team": "Lions",
        "away_team": "Wolves",
        "start_time": "2025-03-16T20:00:00Z",
        "status": "upcoming",
        "odds": {"home_win": 1.85, "away_win": 4.00, "draw": 3.40},
    },
    {
        "id": "game-3",
        "home_team": "Sharks",
        "away_team": "Tigers",
        "start_time": "2025-03-17T18:30:00Z",
        "status": "upcoming",
        "odds": {"home_win": 2.40, "away_win": 2.80, "draw": 3.10},
    },
]


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/games")
def list_games():
    return jsonify(GAMES)


@app.route("/games/<game_id>")
def get_game(game_id):
    for g in GAMES:
        if g["id"] == game_id:
            return jsonify(g)
    return jsonify({"error": "Game not found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
