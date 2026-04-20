"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Event, EventStatus } from "@/types/sports";
import { sortEventsByStatus } from "@/lib/sort-events-by-status";

export const EVENTS_PAGE_SIZE = 9;

/**
 * Client-side sort + pagination over a loaded event list.
 * `resetKey` should change when the user navigates to a different sport/league so page resets.
 */
export function usePaginatedEvents(events: Event[] | null, resetKey: string) {
  const [page, setPage] = useState(1);
  const [sortPrimary, setSortPrimaryState] = useState<EventStatus>("pending");

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

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

  const setSortPrimary = useCallback((v: EventStatus) => {
    setSortPrimaryState(v);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    sortPrimary,
    setSortPrimary,
    pagedEvents,
    totalPages,
  };
}
