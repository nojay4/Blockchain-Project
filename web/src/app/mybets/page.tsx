"use client";

import { useCallback, useEffect, useState } from "react";
import { getListBets } from "@/lib/api";
import type { ListBetsTicketRow } from "@/types/sports";
import { EventCountdownCard } from "@/components/ui/event-countdown-card";
import { EventOddsModal } from "@/components/EventOddsModal";
import { getEventDisplayStatus } from "@/lib/event-status";
import { ticketCardSubtitle, toBigIntWei } from "@/lib/placed-bet-labels";

let inFlightListBetsRequest: Promise<ListBetsTicketRow[]> | null = null;

function getListBetsWithInFlightGuard(): Promise<ListBetsTicketRow[]> {
  if (!inFlightListBetsRequest) {
    inFlightListBetsRequest = getListBets().finally(() => {
      inFlightListBetsRequest = null;
    });
  }
  return inFlightListBetsRequest;
}

export default function MyBetsPage() {
  const [tickets, setTickets] = useState<ListBetsTicketRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<ListBetsTicketRow | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getListBetsWithInFlightGuard()
      .then(setTickets)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load bets")
      )
      .finally(() => setLoading(false));
  }, []);

  const openTicket = useCallback((row: ListBetsTicketRow) => {
    setSelected(row);
    setModalOpen(true);
  }, []);

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">My bets</h1>
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (loading || tickets === null) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">My bets</h1>
        <p className="text-muted-foreground">Loading bets…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">My bets</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((row) => {
          const ev = row.event;
          const pick = ticketCardSubtitle(row.bet);
          const meta =
            ev.league?.name && ev.sport?.name
              ? `${ev.league.name} · ${ev.sport.name}`
              : (ev.league?.name ?? ev.sport?.name);
          const subtitle = meta ? `${pick} · ${meta}` : pick;
          return (
            <EventCountdownCard
              key={row.betId}
              title={`${ev.away} @ ${ev.home}`}
              date={new Date(ev.date)}
              sportSlug={ev.sport?.slug}
              subtitle={subtitle}
              eventStatus={getEventDisplayStatus(ev)}
              scores={ev.scores}
              onJoin={() => openTicket(row)}
              ctaLabel="View bet"
            />
          );
        })}
      </div>
      {tickets.length === 0 && (
        <p className="text-muted-foreground">No bets found on-chain yet.</p>
      )}
      <EventOddsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selected?.event ?? null}
        odds={null}
        loading={false}
        mode="ticket"
        ticketBet={
          selected
            ? {
                betId: selected.betId,
                bettor: selected.bet.bettor,
                betType: selected.bet.bet_type,
                outcome: selected.bet.outcome,
                line: selected.bet.line,
                amountWei: toBigIntWei(selected.bet.amount),
                oddsTimes100: toBigIntWei(selected.bet.odds),
              }
            : null
        }
      />
    </main>
  );
}
