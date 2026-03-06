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

export interface Scores {
  home: number;
  away: number;
}

export interface Event {
  id: number;
  home: string;
  away: string;
  date: string; // ISO datetime
  sport: Sport;
  league: League;
  status: string;
  scores: Scores;
}

// --- Odds (line-level and event-level) ---

export interface Odds {
  home?: number;
  away?: number;
  draw?: number;
}

export interface Line {
  name: string;
  updated_at: string; // ISO datetime
  odds: Odds;
}

export interface Bookmaker {
  key: string; // e.g. "bet365"
  title: string; // e.g. "Bet365"
  lines: Line[];
}

export interface EventOdds {
  id: number;
  home: string;
  away: string;
  date: string; // ISO datetime
  status: string;
  sport: Sport;
  league: League;
  bookmaker_urls?: Record<string, string>;
  bookmakers: Bookmaker[];
}
