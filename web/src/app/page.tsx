"use client";

import { useCallback, useEffect, useState } from "react";
import { getEvents, getOdds } from "@/lib/api";
import type { Event, GetOddsResponse } from "@/types/sports";
import { SportEventsList } from "@/components/SportEventsList";
import { EventOddsModal } from "@/components/EventOddsModal";
import { useBookmakers } from "@/contexts/BookmakersContext";

const EVENTS_PAGE_SIZE = 10;
const HOME_SPORT = "basketball";
const HOME_LEAGUE = "usa-nba";

function slugToTitle(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export default function Home() {
  const { ensureBookmakers } = useBookmakers();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [oddsResponse, setOddsResponse] = useState<GetOddsResponse | null>(null);
  const [oddsLoading, setOddsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEvents(HOME_SPORT, HOME_LEAGUE)
      .then((list) => setEvents(list.slice(0, EVENTS_PAGE_SIZE)))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load events")
      )
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = useCallback(
    async (event: Event) => {
      const bookmakers = await ensureBookmakers();
      if (!bookmakers) return;
      setSelectedEvent(event);
      setOddsResponse(null);
      setModalOpen(true);
      setOddsLoading(true);
      try {
        const data = await getOdds(event.id, bookmakers);
        setOddsResponse(data);
      } catch {
        setOddsResponse(null);
      } finally {
        setOddsLoading(false);
      }
    },
    [ensureBookmakers]
  );

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

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
      <SportEventsList
        events={events}
        sportTitle={slugToTitle(HOME_SPORT)}
        leagueTitle="NBA"
        onJoin={handleJoin}
      />
      <EventOddsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
        odds={oddsResponse}
        loading={oddsLoading}
      />
    </main>
  );
}
