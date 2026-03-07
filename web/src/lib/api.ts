import type { Event, GetOddsResponse, League, Sport } from "@/types/sports";

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

/** Cache TTL in ms; repeat calls within this window reuse cached response. */
const CACHE_TTL_MS = 60_000;

const cache = new Map<
  string,
  { data: unknown; expiresAt: number }
>();
const inFlight = new Map<string, Promise<unknown>>();

async function cachedFetch<T>(
  key: string,
  url: string,
  parse: (res: Response) => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.data as T;

  let promise = inFlight.get(key);
  if (!promise) {
    promise = (async () => {
      try {
        const res = await fetch(url);
        const data = await parse(res);
        cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
        return data;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, promise);
  }
  return promise as Promise<T>;
}

export async function getSports(): Promise<Sport[]> {
  return cachedFetch(
    "sports",
    `${API_BASE}/sports`,
    async (res) => {
      if (!res.ok) throw new Error("Failed to load sports");
      const data = await res.json();
      return data as Sport[];
    }
  );
}

export async function getLeagues(sportSlug: string): Promise<League[]> {
  return cachedFetch(
    `leagues:${sportSlug}`,
    `${API_BASE}/leagues/${sportSlug}`,
    async (res) => {
      if (!res.ok) throw new Error("Failed to load leagues");
      const data = await res.json();
      return data as League[];
    }
  );
}

export async function getEvents(
  sportSlug: string,
  leagueSlug?: string
): Promise<Event[]> {
  const url = leagueSlug
    ? `${API_BASE}/events/${sportSlug}/${leagueSlug}`
    : `${API_BASE}/events/${sportSlug}`;
  const key = leagueSlug
    ? `events:${sportSlug}:${leagueSlug}`
    : `events:${sportSlug}`;
  return cachedFetch(key, url, async (res) => {
    if (!res.ok) throw new Error("Failed to load events");
    const data = await res.json();
    return data as Event[];
  });
}

export async function getBookmakers(): Promise<string> {
  return cachedFetch(
    "bookmakers",
    `${API_BASE}/bookmakers`,
    async (res) => {
      if (!res.ok) throw new Error("Failed to load bookmakers");
      const text = await res.text();
      return text.trim();
    }
  );
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
