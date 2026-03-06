import type { Event, Sport } from "@/types/sports";

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
