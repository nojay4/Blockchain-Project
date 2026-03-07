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
  line?: string;
}

function BetButton({ label, value, variant, line }: BetButtonProps) {
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
      {line && <span className="text-xs font-semibold text-foreground/80">{line}</span>}
      <span className="text-base font-bold font-mono mt-0.5">{value}</span>
    </button>
  );
}

function formatHdp(hdp: number, forAway = false): string {
  const val = forAway ? -hdp : hdp;
  return val >= 0 ? `+${val}` : `${val}`;
}

function OddsLine({ entry }: { entry: OddsEntry }) {
  const hasHomeAway = entry.home || entry.away;
  const hasOverUnder = entry.over || entry.under;

  // Player prop with label (e.g., "Bam Adebayo (1) (0.5)")
  if (entry.label) {
    const playerLabel = entry.label;
    const buttons: { label: string; value: string; variant: BetVariant; line?: string }[] = [];
    
    if (entry.over) {
      buttons.push({
        label: "Over",
        value: entry.over,
        variant: "over",
        line: entry.hdp != null ? `${entry.hdp}` : undefined,
      });
    }
    if (entry.under) {
      buttons.push({
        label: "Under",
        value: entry.under,
        variant: "under",
        line: entry.hdp != null ? `${entry.hdp}` : undefined,
      });
    }

    // Handle Yes/No props (like Double Double, Triple Double)
    if (buttons.length === 0 && (playerLabel.includes("(Yes)") || playerLabel.includes("(No)"))) {
      const isYes = playerLabel.includes("(Yes)");
      buttons.push({
        label: isYes ? "Yes" : "No",
        value: entry.under || entry.over || "—",
        variant: isYes ? "over" : "under",
      });
    }

    if (buttons.length === 0) {
      return <span className="text-sm text-muted-foreground">{playerLabel}</span>;
    }

    return (
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground block">{playerLabel}</span>
        <div className={cn("grid gap-2", buttons.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {buttons.map((btn, i) => (
            <BetButton key={i} {...btn} />
          ))}
        </div>
      </div>
    );
  }

  // Game totals (Over/Under with hdp as the line)
  if (hasOverUnder && !hasHomeAway) {
    const lineStr = entry.hdp != null ? `${entry.hdp}` : undefined;
    return (
      <div className="grid grid-cols-2 gap-2">
        {entry.over && (
          <BetButton label="Over" value={entry.over} variant="over" line={lineStr} />
        )}
        {entry.under && (
          <BetButton label="Under" value={entry.under} variant="under" line={lineStr} />
        )}
      </div>
    );
  }

  // Spread (Home/Away with hdp as the spread line)
  if (hasHomeAway && entry.hdp != null) {
    return (
      <div className={cn("grid gap-2", entry.draw ? "grid-cols-3" : "grid-cols-2")}>
        {entry.home && (
          <BetButton 
            label="Home" 
            value={entry.home} 
            variant="home" 
            line={formatHdp(entry.hdp)} 
          />
        )}
        {entry.draw && (
          <BetButton label="Draw" value={entry.draw} variant="draw" />
        )}
        {entry.away && (
          <BetButton 
            label="Away" 
            value={entry.away} 
            variant="away" 
            line={formatHdp(entry.hdp, true)} 
          />
        )}
      </div>
    );
  }

  // Moneyline (Home/Away/Draw, no hdp)
  if (hasHomeAway) {
    const buttonCount = [entry.home, entry.away, entry.draw].filter(Boolean).length;
    return (
      <div className={cn("grid gap-2", buttonCount === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {entry.home && (
          <BetButton label="Home" value={entry.home} variant="home" />
        )}
        {entry.draw && (
          <BetButton label="Draw" value={entry.draw} variant="draw" />
        )}
        {entry.away && (
          <BetButton label="Away" value={entry.away} variant="away" />
        )}
      </div>
    );
  }

  return <span className="text-sm text-muted-foreground">—</span>;
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
