"""
Odds-API.io client factory. Uses SPORTS_API_KEY from env.
"""
import os


def get_client():
    """Configured OddsAPIClient. Use as context manager."""
    from odds_api import OddsAPIClient

    key = os.environ.get("SPORTS_API_KEY")
    if not key:
        raise ValueError("SPORTS_API_KEY is not set")
    return OddsAPIClient(api_key=key)
