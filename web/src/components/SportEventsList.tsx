"use client";

import type { Event } from "@/types/sports";
import { EventCountdownCard } from "@/components/ui/event-countdown-card";
import { getEventDisplayStatus } from "@/lib/event-status";

export interface SportEventsListProps {
  events: Event[];
  sportTitle: string;
  leagueTitle?: string;
  onJoin: (event: Event) => void;
}

export function SportEventsList({
  events,
  sportTitle,
  leagueTitle,
  onJoin,
}: SportEventsListProps) {
  const emptyLabel = leagueTitle
    ? `No events for ${sportTitle} / ${leagueTitle}.`
    : `No events for ${sportTitle}.`;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            eventStatus={getEventDisplayStatus(event)}
            scores={event.scores}
            onJoin={() => onJoin(event)}
          />
        ))}
      </div>
      {events.length === 0 && (
        <p className="text-muted-foreground">{emptyLabel}</p>
      )}
    </>
  );
}
