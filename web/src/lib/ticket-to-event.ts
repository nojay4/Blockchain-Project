import type { Event, ListBetsEventRaw } from "@/types/sports";

function asSportLeague(
  v: unknown,
  fallbackName: string,
  fallbackSlug: string
): { name: string; slug: string } {
  if (v && typeof v === "object" && "name" in v && "slug" in v) {
    const o = v as { name?: unknown; slug?: unknown };
    const name = typeof o.name === "string" ? o.name : fallbackName;
    const slug = typeof o.slug === "string" ? o.slug : fallbackSlug;
    return { name, slug };
  }
  if (typeof v === "string") {
    return { name: v, slug: v.toLowerCase().replace(/\s+/g, "-") };
  }
  return { name: fallbackName, slug: fallbackSlug };
}

/** Map `/list-bets` embedded event to the shared `Event` type. */
export function ticketEventToEvent(raw: ListBetsEventRaw): Event {
  const sport = asSportLeague(raw.sport, "Sport", "sport");
  const league = asSportLeague(raw.league, "League", "league");
  return {
    id: raw.id,
    home: raw.home_team,
    away: raw.away_team,
    date: raw.date,
    sport,
    league,
    status: raw.status,
    scores: raw.scores,
  };
}
