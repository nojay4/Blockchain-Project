"use client";

import type { Event, GetOddsResponse, OddsEntry } from "@/types/sports";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EventOddsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  odds: GetOddsResponse | null;
  loading?: boolean;
}

function formatOddsLine(entry: OddsEntry): string {
  const parts: string[] = [];
  if (entry.hdp != null) parts.push(`Line ${entry.hdp}`);
  if (entry.label) parts.push(entry.label);
  if (entry.home) parts.push(`Home ${entry.home}`);
  if (entry.away) parts.push(`Away ${entry.away}`);
  if (entry.draw) parts.push(`Draw ${entry.draw}`);
  if (entry.over) parts.push(`Over ${entry.over}`);
  if (entry.under) parts.push(`Under ${entry.under}`);
  return parts.filter(Boolean).join(" · ") || "—";
}

export function EventOddsModal({
  open,
  onOpenChange,
  event,
  odds,
  loading = false,
}: EventOddsModalProps) {
  const eventLabel = event
    ? `${event.away} @ ${event.home}`
    : "";
  const eventMeta = event
    ? [event.league?.name, event.sport?.name].filter(Boolean).join(" · ")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eventLabel || "Event odds"}</DialogTitle>
          {eventMeta && (
            <DialogDescription>{eventMeta}</DialogDescription>
          )}
          {event?.date && (
            <DialogDescription>
              {new Date(event.date).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <p className="text-muted-foreground text-sm">Loading odds…</p>
        )}

        {!loading && odds?.bookmakers && Object.keys(odds.bookmakers).length > 0 && (
          <div className="space-y-6">
            {Object.entries(odds.bookmakers).map(([bookmakerName, markets]) => (
              <div key={bookmakerName} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">
                  {bookmakerName}
                </h3>
                <div className="space-y-4">
                  {markets.map((market) => (
                    <div key={market.name} className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {market.name}
                      </h4>
                      <ul className="space-y-1.5 text-sm">
                        {market.odds.map((entry, i) => (
                          <li
                            key={i}
                            className={cn(
                              "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-muted/50 px-2 py-1.5"
                            )}
                          >
                            {formatOddsLine(entry)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && odds && (!odds.bookmakers || Object.keys(odds.bookmakers).length === 0) && (
          <p className="text-muted-foreground text-sm">No odds available.</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
