from odds_client import get_client


if __name__ == "__main__":
    
    from list_bets import *
    logs = get_raw_logs()
    c = make_contract()
    bets = decoded_bets(logs, c)
    tickets = get_tickets(bets)
    print(tickets)

