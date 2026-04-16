"use client";

import { useCallback, useEffect, useState } from "react";
import type { Event, GetOddsResponse, OddsEntry } from "@/types/sports";
import type { BetQuoteRequest, BetQuoteResponse } from "@/types/contract";
import { getEventDisplayStatus, formatScore, hasScore } from "@/lib/event-status";
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
import { isBetValid } from "@/lib/bet-validation";
import { postBetQuote } from "@/lib/api";
import { sportsBettingAbi } from "@/lib/sports-betting-abi";
import { getSportsBettingContractAddress } from "@/lib/contract-address";
import {
  useAccount,
  useChainId,
  useConnect,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { parseEther } from "viem";

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
  disabled?: boolean;
  onPick?: () => void;
}

const disabledStyles = "opacity-40 cursor-not-allowed border-muted-foreground/30 bg-muted/30";

function BetButton({
  label,
  value,
  variant,
  line,
  disabled = false,
  onPick,
}: BetButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled || !onPick ? undefined : onPick}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2.5 transition-all duration-150 min-w-0",
        disabled
          ? disabledStyles
          : [
              "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
              "cursor-pointer select-none",
              variantStyles[variant],
            ]
      )}
    >
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      {line && <span className={cn("text-xs font-semibold", disabled ? "text-muted-foreground/60" : "text-foreground/80")}>{line}</span>}
      <span className={cn("text-base font-bold font-mono mt-0.5", disabled && "text-muted-foreground")}>{value}</span>
    </button>
  );
}

function formatHdp(hdp: number, forAway = false): string {
  const val = forAway ? -hdp : hdp;
  return val >= 0 ? `+${val}` : `${val}`;
}

function isMoneylineMarketName(name: string): boolean {
  const n = name.toLowerCase().trim();
  return (
    n === "ml" ||
    n.includes("money") ||
    n.includes("moneyline") ||
    n === "1x2"
  );
}

/** Moneyline only: maps UI selection to contract `Outcome` enum (uint8). */
function selectionToContractArgs(
  event: Event,
  outcome: 0 | 1 | 2
): Pick<BetQuoteRequest, "gameId" | "betType" | "outcome" | "line"> {
  return {
    gameId: String(event.id),
    betType: 0,
    outcome,
    line: 0,
  };
}

function outcomeLabel(o: 0 | 1 | 2): string {
  if (o === 0) return "Home";
  if (o === 1) return "Away";
  return "Draw";
}

function buildQuoteRequest(
  event: Event,
  bettor: `0x${string}`,
  bookmakers: string,
  outcome: 0 | 1 | 2
): BetQuoteRequest {
  return {
    bettor,
    ...selectionToContractArgs(event, outcome),
    eventId: event.id,
    bookmakers,
  };
}

interface OddsLineProps {
  entry: OddsEntry;
  sportSlug?: string;
  marketName?: string;
  isMoneylineMarket?: boolean;
  onMoneylinePick?: (outcome: 0 | 1 | 2) => void;
}

function OddsLine({
  entry,
  sportSlug,
  marketName,
  isMoneylineMarket,
  onMoneylinePick,
}: OddsLineProps) {
  const hasHomeAway = entry.home || entry.away;
  const hasOverUnder = entry.over || entry.under;
  const disabled = !isBetValid(sportSlug, marketName, entry);

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
        <span className={cn("text-xs font-medium block", disabled ? "text-muted-foreground/60" : "text-foreground")}>{playerLabel}</span>
        <div className={cn("grid gap-2", buttons.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {buttons.map((btn, i) => (
            <BetButton key={i} {...btn} disabled={disabled} />
          ))}
        </div>
      </div>
    );
  }

  if (isMoneylineMarket && hasHomeAway && !entry.label) {
    const buttonCount = [entry.home, entry.away, entry.draw].filter(Boolean).length;
    const canPick = Boolean(onMoneylinePick) && !disabled;
    return (
      <div className={cn("grid gap-2", buttonCount === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {entry.home && (
          <BetButton
            label="Home"
            value={entry.home}
            variant="home"
            disabled={disabled}
            onPick={canPick && entry.home ? () => onMoneylinePick!(0) : undefined}
          />
        )}
        {entry.draw && (
          <BetButton
            label="Draw"
            value={entry.draw}
            variant="draw"
            disabled={disabled}
            onPick={canPick && entry.draw ? () => onMoneylinePick!(2) : undefined}
          />
        )}
        {entry.away && (
          <BetButton
            label="Away"
            value={entry.away}
            variant="away"
            disabled={disabled}
            onPick={canPick && entry.away ? () => onMoneylinePick!(1) : undefined}
          />
        )}
      </div>
    );
  }

  if (hasOverUnder && !hasHomeAway) {
    const lineStr = entry.hdp != null ? `${entry.hdp}` : undefined;
    return (
      <div className="grid grid-cols-2 gap-2">
        {entry.over && (
          <BetButton label="Over" value={entry.over} variant="over" line={lineStr} disabled={disabled} />
        )}
        {entry.under && (
          <BetButton label="Under" value={entry.under} variant="under" line={lineStr} disabled={disabled} />
        )}
      </div>
    );
  }

  if (hasHomeAway && entry.hdp != null) {
    return (
      <div className={cn("grid gap-2", entry.draw ? "grid-cols-3" : "grid-cols-2")}>
        {entry.home && (
          <BetButton
            label="Home"
            value={entry.home}
            variant="home"
            line={formatHdp(entry.hdp)}
            disabled={disabled}
          />
        )}
        {entry.draw && (
          <BetButton label="Draw" value={entry.draw} variant="draw" disabled={disabled} />
        )}
        {entry.away && (
          <BetButton
            label="Away"
            value={entry.away}
            variant="away"
            line={formatHdp(entry.hdp, true)}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  if (hasHomeAway) {
    const buttonCount = [entry.home, entry.away, entry.draw].filter(Boolean).length;
    return (
      <div className={cn("grid gap-2", buttonCount === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {entry.home && (
          <BetButton label="Home" value={entry.home} variant="home" disabled={disabled} />
        )}
        {entry.draw && (
          <BetButton label="Draw" value={entry.draw} variant="draw" disabled={disabled} />
        )}
        {entry.away && (
          <BetButton label="Away" value={entry.away} variant="away" disabled={disabled} />
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
  const { address } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending: isConnectingWallet } = useConnect();
  const { switchChain, switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isPlacing } = useWriteContract();

  const [modalPhase, setModalPhase] = useState<"odds" | "stake">("odds");
  const [pick, setPick] = useState<0 | 1 | 2 | null>(null);
  const [quote, setQuote] = useState<BetQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [stakeEth, setStakeEth] = useState("0.001");

  useEffect(() => {
    if (!open) {
      setModalPhase("odds");
      setPick(null);
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      setPlaceError(null);
      setStakeEth("0.001");
    }
  }, [open]);

  const bookmakersCsv = odds?.bookmakers
    ? Object.keys(odds.bookmakers).join(",")
    : "";

  const handleMoneylinePick = useCallback(
    (outcome: 0 | 1 | 2) => {
      if (!event || !odds || !bookmakersCsv) return;
      setPick(outcome);
      setModalPhase("stake");
      setQuote(null);
      setQuoteError(null);
      setPlaceError(null);
    },
    [event, odds, bookmakersCsv]
  );

  useEffect(() => {
    if (!open || modalPhase !== "stake" || pick === null || !event || !bookmakersCsv) return;
    if (!address) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);

    (async () => {
      try {
        const body = buildQuoteRequest(event, address, bookmakersCsv, pick);
        const q = await postBetQuote(body);
        if (!cancelled) setQuote(q);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setQuoteError(e instanceof Error ? e.message : "Quote failed");
          setQuote(null);
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, modalPhase, pick, bookmakersCsv, address, event?.id]);

  const backToOdds = () => {
    setModalPhase("odds");
    setPick(null);
    setQuote(null);
    setQuoteError(null);
    setPlaceError(null);
  };

  const handlePlaceBet = async () => {
    setPlaceError(null);
    const contractAddr = getSportsBettingContractAddress();
    if (!contractAddr) {
      setPlaceError(
        "Missing NEXT_PUBLIC_CONTRACT_ADDRESS. In web/, copy .env.example to .env.local and set it to the same value as CONTRACT_ADDRESS in the repo root .env."
      );
      return;
    }
    if (!event || !quote || pick === null) return;
    if (chainId !== sepolia.id) {
      try {
        switchChain?.({ chainId: sepolia.id });
      } catch (e) {
        console.error(e);
        setPlaceError("Switch to Sepolia in your wallet.");
      }
      return;
    }
    let valueWei;
    try {
      valueWei = parseEther(stakeEth.trim() || "0");
    } catch {
      setPlaceError("Invalid stake amount");
      return;
    }
    if (valueWei <= BigInt(0)) {
      setPlaceError("Stake must be > 0");
      return;
    }
    try {
      await writeContractAsync({
        chainId: sepolia.id,
        address: contractAddr,
        abi: sportsBettingAbi,
        functionName: "placeBet",
        args: [
          String(event.id),
          0,
          pick,
          BigInt(0),
          BigInt(quote.odds),
          BigInt(quote.nonce),
          BigInt(quote.expiry),
          quote.signature,
        ],
        value: valueWei,
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      setPlaceError(e instanceof Error ? e.message : "Transaction failed");
    }
  };

  const handleConnect = async () => {
    const c = connectors.find((x) => x.id === "injected") ?? connectors[0];
    if (!c) return;
    try {
      await connectAsync({ connector: c });
      await switchChainAsync({ chainId: sepolia.id });
    } catch (e) {
      console.error(e);
      setPlaceError("Switch to Sepolia in your wallet.");
    }
  };

  const eventLabel = event ? `${event.away} @ ${event.home}` : "";
  const eventMeta = event
    ? [event.league?.name, event.sport?.name].filter(Boolean).join(" · ")
    : "";
  const displayStatus = event ? getEventDisplayStatus(event) : null;
  const showScore = event && (displayStatus === "live" || displayStatus === "settled") && hasScore(event.scores);

  const bookmakerEntries = odds?.bookmakers
    ? Object.entries(odds.bookmakers)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="relative">
          {(displayStatus === "live" || displayStatus === "settled") && (
            <div className="absolute top-0 right-0 flex items-center gap-2">
              {displayStatus === "live" && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-80" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-200 ring-2 ring-white/80" />
                  </span>
                  Live
                </span>
              )}
              {displayStatus === "settled" && (
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                  Settled
                </span>
              )}
            </div>
          )}
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
          {showScore && (
            <DialogDescription className="text-base font-semibold text-foreground">
              {formatScore(event.scores)}
            </DialogDescription>
          )}
        </DialogHeader>

        {modalPhase === "stake" && event && (
          <div className="space-y-4 py-2">
            <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2" onClick={backToOdds}>
              ← Back to odds
            </Button>
            <p className="text-sm text-muted-foreground">
              Moneyline · {outcomeLabel(pick ?? 0)}
            </p>
            {!address && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Connect a wallet (Sepolia) to get a signed quote and place your bet.
                </p>
                <Button type="button" disabled={isConnectingWallet} onClick={() => void handleConnect()}>
                  {isConnectingWallet ? "Connecting…" : "Connect wallet"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can also use <span className="font-medium text-foreground">Connect wallet</span> in the
                  header.
                </p>
              </div>
            )}
            {address && chainId !== sepolia.id && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Switch your wallet to Sepolia.</p>
                <Button type="button" variant="secondary" onClick={() => switchChain?.({ chainId: sepolia.id })}>
                  Switch to Sepolia
                </Button>
              </div>
            )}
            {address && chainId === sepolia.id && (
              <>
                {quoteLoading && (
                  <p className="text-sm text-muted-foreground">Getting quote…</p>
                )}
                {quoteError && <p className="text-sm text-destructive">{quoteError}</p>}
                {quote && !quoteLoading && (
                  <>
                    <p className="text-sm">
                      Decimal odds (signed):{" "}
                      <span className="font-mono font-semibold">{(quote.odds / 100).toFixed(2)}</span>
                    </p>
                    <div className="space-y-1.5">
                      <label htmlFor="stake-eth" className="text-sm font-medium">
                        Stake (ETH)
                      </label>
                      <input
                        id="stake-eth"
                        type="text"
                        inputMode="decimal"
                        value={stakeEth}
                        onChange={(ev) => setStakeEth(ev.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    {placeError && <p className="text-sm text-destructive">{placeError}</p>}
                    <Button type="button" disabled={isPlacing} onClick={() => void handlePlaceBet()}>
                      {isPlacing ? "Confirm in wallet…" : "Place bet"}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {modalPhase === "odds" && (
          <>
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
                                  <OddsLine
                                    key={i}
                                    entry={entry}
                                    sportSlug={event?.sport?.slug}
                                    marketName={market.name}
                                    isMoneylineMarket={isMoneylineMarketName(market.name)}
                                    onMoneylinePick={handleMoneylinePick}
                                  />
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
          </>
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
