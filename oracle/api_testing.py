from odds_client import get_client

if __name__ == "__main__":
    with get_client() as client:
        bookmakers_resp = client.get_selected_bookmakers()
        bookmakers = ",".join(bookmakers_resp["bookmakers"])
        sports = client.get_sports()
        leagues = client.get_leagues("basketball")
        live = client.get_live_events("basketball")
        events = client.get_events("basketball", league="usa-nba")
        event = events[9]["id"]
        odds = client.get_event_odds(event_id=event, bookmakers=bookmakers)
    print(bookmakers)
