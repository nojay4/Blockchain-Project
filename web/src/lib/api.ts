import type { Event, GetOddsResponse, League, Sport } from "@/types/sports";
import type { BetQuoteRequest, BetQuoteResponse } from "@/types/contract";

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export async function getSports(): Promise<Sport[]> {
  const res = await fetch(`${API_BASE}/sports`);
  if (!res.ok) throw new Error("Failed to load sports");
  const data = await res.json();
  return data as Sport[];
}

export async function getLeagues(sportSlug: string): Promise<League[]> {
  const res = await fetch(`${API_BASE}/leagues/${sportSlug}`);
  if (!res.ok) throw new Error("Failed to load leagues");
  const data = await res.json();
  return data as League[];
}

export async function getEvents(
  sportSlug: string,
  leagueSlug?: string
): Promise<Event[]> {
  const url = leagueSlug
    ? `${API_BASE}/events/${sportSlug}/${leagueSlug}`
    : `${API_BASE}/events/${sportSlug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load events");
  const data = await res.json();
  return data as Event[];
}

export async function getBookmakers(): Promise<string> {
  const res = await fetch(`${API_BASE}/bookmakers`);
  if (!res.ok) throw new Error("Failed to load bookmakers");
  const data = await res.text();
  return data.trim();
}

export async function getOdds(
  eventId: number,
  bookmakers: string
): Promise<GetOddsResponse> {
  const path = `${API_BASE}/odds/${eventId}/${encodeURIComponent(bookmakers)}`;
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load odds");
  const data = await res.json();
  return data as GetOddsResponse;
}

export async function postBetQuote(
  body: BetQuoteRequest
): Promise<BetQuoteResponse> {
  const res = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Quote failed";
    try {
      const err = (await res.json()) as { error?: string };
      if (err?.error) message = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<BetQuoteResponse>;
}
