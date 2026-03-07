import type { Event, Scores } from "@/types/sports";

export type EventDisplayStatus = "starts_soon" | "live" | "settled";

/**
 * Event status from the API is exactly: pending (upcoming), live, or settled.
 * When pending and within 24h we show "starts_soon"; otherwise pending shows no badge.
 */
export function getEventDisplayStatus(event: Event): EventDisplayStatus | null {
  const status = (event.status ?? "").toLowerCase().trim();
  if (status === "live") return "live";
  if (status === "settled") return "settled";
  if (status === "pending") {
    const eventTime = new Date(event.date).getTime();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (eventTime > now && eventTime - now <= oneDayMs) return "starts_soon";
    return null;
  }
  return null;
}

/** Format score for display (e.g. "98 - 102" or "2 - 1"). */
export function formatScore(scores: Scores | undefined): string {
  if (!scores || (scores.home == null && scores.away == null)) return "";
  const home = scores.home ?? 0;
  const away = scores.away ?? 0;
  return `${home} – ${away}`;
}

/** Whether we have a valid score to show (both values present or at least one). */
export function hasScore(scores: Scores | undefined): boolean {
  if (!scores) return false;
  return scores.home != null || scores.away != null;
}
