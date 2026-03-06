from odds_client import *




if __name__ == "__main__":
    client = get_client()
    bookmakers = get_bookmakers()
    sports = get_sports()
    leagues = get_leagues('basketball')
    live = get_live_events('basketball')
    events = get_events('basketball', league='usa-nba')
    event = events[9]['id']
    odds = get_odds(event, bookmakers)
    print(bookmakers)