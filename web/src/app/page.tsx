"use client";

import { useCallback, useEffect, useState } from "react";
import { getEvents, getOdds } from "@/lib/api";
import type { Event, GetOddsResponse } from "@/types/sports";
import { SportEventsList } from "@/components/SportEventsList";
import { EventOddsModal } from "@/components/EventOddsModal";
import { EventsPagination } from "@/components/EventsPagination";
import { EventsSortToolbar } from "@/components/EventsSortToolbar";
import { useBookmakers } from "@/contexts/BookmakersContext";
import { usePaginatedEvents } from "@/hooks/use-paginated-events";

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
      .then((list) => setEvents(list))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load events")
      )
      .finally(() => setLoading(false));
  }, []);

  const {
    page,
    setPage,
    sortPrimary,
    setSortPrimary,
    pagedEvents,
    totalPages,
  } = usePaginatedEvents(events, `${HOME_SPORT}-${HOME_LEAGUE}`);

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
      <EventsSortToolbar
        sortPrimary={sortPrimary}
        onSortPrimaryChange={setSortPrimary}
      />
      <SportEventsList
        events={pagedEvents}
        sportTitle={slugToTitle(HOME_SPORT)}
        leagueTitle="NBA"
        onJoin={handleJoin}
      />
      <EventsPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
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
