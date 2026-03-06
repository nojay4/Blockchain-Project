"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEvents } from "@/lib/api";
import type { Event } from "@/types/sports";
import { EventCountdownCard } from "@/components/ui/event-countdown-card";

const EVENTS_PAGE_SIZE = 10;

function slugToTitle(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export default function SportEventsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getEvents(slug)
      .then((list) => setEvents(list.slice(0, EVENTS_PAGE_SIZE)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load events"))
      .finally(() => setLoading(false));
  }, [slug]);

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

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCountdownCard
            key={event.id}
            title={`${event.away} @ ${event.home}`}
            date={new Date(event.date)}
            sportSlug={event.sport?.slug}
            subtitle={
              event.league?.name && event.sport?.name
                ? `${event.league.name} · ${event.sport.name}`
                : event.league?.name ?? event.sport?.name ?? undefined
            }
            onJoin={() => router.push(`/events/${event.id}`)}
          />
        ))}
      </div>
      {events.length === 0 && (
        <p className="text-muted-foreground">No events for {sportTitle}.</p>
      )}
    </main>
  );
}
