/**
 * Types for sports, leagues, events, and odds from the sports/odds API.
 */

// --- Sport & League ---

export interface Sport {
  name: string;
  slug: string;
}

export interface League {
  name: string;
  slug: string;
}

// --- Event ---

/** Event status from API: pending (upcoming), live, or settled. */
export type EventStatus = "pending" | "live" | "settled";

export interface Scores {
  home: number;
  away: number;
}

export interface Event {
  id: number;
  home: string;
  away: string;
  homeId?: number;
  awayId?: number;
  date: string; // ISO datetime
  sport: Sport;
  league: League;
  status: EventStatus;
  scores: Scores;
}

// --- Odds (get_odds / bookmakers response) ---

/** Single line in a market; fields vary by market/sport (ML, Spread, Totals, Props, etc.). */
export interface OddsEntry {
  home?: string;
  away?: string;
  draw?: string;
  hdp?: number;
  over?: string;
  under?: string;
  label?: string;
}

export interface OddsMarket {
  name: string;
  odds: OddsEntry[];
  updatedAt: string;
}

/** Key = bookmaker name, value = array of markets. */
export type BookmakersOddsMap = Record<string, OddsMarket[]>;

export interface GetOddsResponse {
  bookmakerIds?: Record<string, string>;
  bookmakers: BookmakersOddsMap;
}

// --- List bets (`/list-bets`) ---

/** Bet fields from chain / oracle (snake_case). */
export interface ListBetsBetRaw {
  bettor: string;
  game_id: string;
  bet_type: number;
  outcome: number;
  line: number;
  amount: number | string;
  odds: number | string;
}

/** Event payload inside list-bets before mapping to `Event`. */
export interface ListBetsEventRaw {
  id: number;
  home_team: string;
  away_team: string;
  date: string;
  sport: Sport | string;
  league: League | string;
  status: EventStatus;
  scores: Scores;
}

export interface ListBetsTicketRaw {
  bet: ListBetsBetRaw;
  event: ListBetsEventRaw;
}

/** One row per bet for UI (sorted newest-first by `betId`). */
export interface ListBetsTicketRow {
  betId: string;
  bet: ListBetsBetRaw;
  event: Event;
}
