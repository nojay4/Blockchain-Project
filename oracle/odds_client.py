"""
Odds-API.io client wrapper. Uses SPORTS_API_KEY from env.
Auto-selects first two bookmakers from the API for get_event_odds (free tier).
"""
import os
from typing import Any, Optional

_selected_bookmakers: list[str] = []


def get_client():
    """Configured OddsAPIClient. Use as context manager."""
    from odds_api import OddsAPIClient

    key = os.environ.get("SPORTS_API_KEY")
    if not key:
        raise ValueError("SPORTS_API_KEY is not set")
    return OddsAPIClient(api_key=key)

def get_bookmakers() -> list[str]:
    with get_client() as client:
        response = client.get_selected_bookmakers()
        return ','.join(response["bookmakers"])

def get_sports() -> list[dict]:
    with get_client() as client:
        return client.get_sports()
def get_leagues(sport: str) -> list[dict]:
    with get_client() as client:
        return client.get_leagues(sport)

def get_events(sport: str, league: str = None) -> list[dict]:
    with get_client() as client:
        return client.get_events(sport, league=league)
def get_odds(event_id: int, bookmakers: list[str]) -> dict:
    with get_client() as client:
        return client.get_event_odds(event_id=event_id, bookmakers=bookmakers)
def get_live_events(sport: str) -> list[dict]:
    with get_client() as client:
        return client.get_live_events(sport)