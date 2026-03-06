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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EventOddsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  odds: GetOddsResponse | null;
  loading?: boolean;
}

type BetVariant = "home" | "away" | "draw" | "over" | "under" | "neutral";

const variantStyles: Record<BetVariant, string> = {
  home: "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500",
  away: "border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500",
  draw: "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500",
  over: "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500",
  under: "border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500",
  neutral: "border-border bg-muted/50 hover:bg-muted hover:border-foreground/30",
};

interface BetButtonProps {
  label: string;
  value: string;
  variant: BetVariant;
  subLabel?: string;
}

function BetButton({ label, value, variant, subLabel }: BetButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2.5 transition-all duration-150 min-w-0",
        "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
        "cursor-pointer select-none",
        variantStyles[variant]
      )}
    >
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      {subLabel && <span className="text-[10px] text-muted-foreground/70">{subLabel}</span>}
      <span className="text-base font-bold font-mono mt-0.5">{value}</span>
    </button>
  );
}

function OddsLine({ entry }: { entry: OddsEntry }) {
  const buttons: { label: string; value: string; variant: BetVariant; subLabel?: string }[] = [];

  if (entry.home) {
    buttons.push({
      label: "Home",
      value: entry.home,
      variant: "home",
      subLabel: entry.hdp != null ? (entry.hdp >= 0 ? `+${entry.hdp}` : `${entry.hdp}`) : undefined,
    });
  }

  if (entry.draw) {
    buttons.push({ label: "Draw", value: entry.draw, variant: "draw" });
  }

  if (entry.away) {
    buttons.push({
      label: "Away",
      value: entry.away,
      variant: "away",
      subLabel: entry.hdp != null ? (entry.hdp >= 0 ? `${-entry.hdp}` : `+${-entry.hdp}`) : undefined,
    });
  }

  if (entry.over) {
    buttons.push({
      label: "Over",
      value: entry.over,
      variant: "over",
      subLabel: entry.label,
    });
  }

  if (entry.under) {
    buttons.push({
      label: "Under",
      value: entry.under,
      variant: "under",
      subLabel: entry.label,
    });
  }

  if (buttons.length === 0) {
    if (entry.label) {
      return <span className="text-sm text-muted-foreground">{entry.label}</span>;
    }
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className={cn(
      "grid gap-2",
      buttons.length === 1 && "grid-cols-1",
      buttons.length === 2 && "grid-cols-2",
      buttons.length >= 3 && "grid-cols-3"
    )}>
      {buttons.map((btn, i) => (
        <BetButton key={i} {...btn} />
      ))}
    </div>
  );
}

export function EventOddsModal({
  open,
  onOpenChange,
  event,
  odds,
  loading = false,
}: EventOddsModalProps) {
  const eventLabel = event ? `${event.away} @ ${event.home}` : "";
  const eventMeta = event
    ? [event.league?.name, event.sport?.name].filter(Boolean).join(" · ")
    : "";

  const bookmakerEntries = odds?.bookmakers
    ? Object.entries(odds.bookmakers)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eventLabel || "Event odds"}</DialogTitle>
          {eventMeta && <DialogDescription>{eventMeta}</DialogDescription>}
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
          <p className="text-muted-foreground text-sm py-4">Loading odds…</p>
        )}

        {!loading && bookmakerEntries.length > 0 && (
          <Accordion type="multiple" className="w-full space-y-2">
            {bookmakerEntries.map(([bookmakerName, markets]) => (
              <AccordionItem
                key={bookmakerName}
                value={bookmakerName}
                className="border-0 rounded-lg bg-muted/30 data-[state=open]:bg-muted/50 data-[state=open]:shadow-lg data-[state=open]:ring-1 data-[state=open]:ring-border transition-all duration-200"
              >
                <AccordionTrigger className="text-sm font-semibold py-3 px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{bookmakerName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {markets.length} market{markets.length !== 1 && "s"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <Accordion type="multiple" className="w-full space-y-2">
                    {markets.map((market) => (
                      <AccordionItem
                        key={market.name}
                        value={market.name}
                        className="border-0 rounded-md bg-background/50 data-[state=open]:bg-background data-[state=open]:shadow-md data-[state=open]:ring-1 data-[state=open]:ring-border/50 transition-all duration-200"
                      >
                        <AccordionTrigger className="text-xs py-2.5 px-3 hover:no-underline">
                          <span className="uppercase tracking-wide text-muted-foreground font-medium">
                            {market.name}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3">
                            {market.odds.map((entry, i) => (
                              <OddsLine key={i} entry={entry} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {!loading && bookmakerEntries.length === 0 && odds && (
          <p className="text-muted-foreground text-sm py-4">No odds available.</p>
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
