"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getEvents, getOdds } from "@/lib/api";
import type { Event, EventStatus, GetOddsResponse } from "@/types/sports";
import { SportEventsList } from "@/components/SportEventsList";
import { EventOddsModal } from "@/components/EventOddsModal";
import { EventsPagination } from "@/components/EventsPagination";
import { useBookmakers } from "@/contexts/BookmakersContext";
import { sortEventsByStatus } from "@/lib/sort-events-by-status";

const EVENTS_PAGE_SIZE = 9;
const HOME_SPORT = "basketball";
const HOME_LEAGUE = "usa-nba";

function slugToTitle(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export default function Home() {
  const { ensureBookmakers } = useBookmakers();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [page, setPage] = useState(1);
  const [sortPrimary, setSortPrimary] = useState<EventStatus>("pending");
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

  const sortedEvents = useMemo(
    () => (events ? sortEventsByStatus(events, sortPrimary) : []),
    [events, sortPrimary]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(sortedEvents.length / EVENTS_PAGE_SIZE)
  );

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const pagedEvents = useMemo(
    () =>
      sortedEvents.slice(
        (page - 1) * EVENTS_PAGE_SIZE,
        page * EVENTS_PAGE_SIZE
      ),
    [sortedEvents, page]
  );

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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-2">
          <span className="text-muted-foreground">Status order</span>
          <select
            value={sortPrimary}
            onChange={(e) => {
              setSortPrimary(e.target.value as EventStatus);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="pending">Pending first</option>
            <option value="live">Live first</option>
            <option value="settled">Settled first</option>
          </select>
        </label>
      </div>
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
