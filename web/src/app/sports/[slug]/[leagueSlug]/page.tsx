"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEvents } from "@/lib/api";
import type { Event } from "@/types/sports";
import { SportEventsList } from "@/components/SportEventsList";

const EVENTS_PAGE_SIZE = 10;

function slugToTitle(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export default function SportLeagueEventsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const leagueSlug = params?.leagueSlug as string;
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !leagueSlug) return;
    setLoading(true);
    setError(null);
    getEvents(slug, leagueSlug)
      .then((list) => setEvents(list.slice(0, EVENTS_PAGE_SIZE)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, [slug, leagueSlug]);

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (loading || events === null) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
        <p className="text-muted-foreground">Loading events…</p>
      </main>
    );
  }

  const sportTitle = slugToTitle(slug);
  const leagueTitle = slugToTitle(leagueSlug);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
      <SportEventsList
        events={events}
        sportTitle={sportTitle}
        leagueTitle={leagueTitle}
        onJoin={(id) => router.push(`/events/${id}`)}
      />
    </main>
  );
}
