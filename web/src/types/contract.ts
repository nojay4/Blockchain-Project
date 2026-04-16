export interface BetQuoteRequest {
  bettor: string;
  gameId: string;
  betType: number;
  outcome: number;
  line: number;
  eventId: number;
  bookmakers: string;
}

export interface BetQuoteResponse {
  odds: number;
  nonce: number;
  expiry: number;
  signature: `0x${string}`;
}
