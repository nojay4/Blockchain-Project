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
import { postBetQuote, postReportResult } from "@/lib/api";
import { sportsBettingAbi } from "@/lib/sports-betting-abi";
import { getSportsBettingContractAddress } from "@/lib/contract-address";
import {
  useAccount,
  useChainId,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatEther, isAddressEqual, parseEther } from "viem";
import {
  betTypeLabel,
  decimalOddsFromChain,
  formatLineForDisplay,
  outcomeLabel as placedOutcomeLabel,
} from "@/lib/placed-bet-labels";

export interface EventOddsModalTicketBet {
  betId: string;
  bettor: string;
  betType: number;
  outcome: number;
  line: number;
  amountWei: bigint;
  oddsTimes100: bigint;
}

export interface EventOddsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  odds: GetOddsResponse | null;
  loading?: boolean;
  /** Read-only bet details (My Bets); omits odds book and stake flow. */
  mode?: "placeBet" | "ticket";
  ticketBet?: EventOddsModalTicketBet | null;
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

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ticketBarcodeHeights(seed: string): number[] {
  const s = seed.length ? seed : "0";
  const out: number[] = [];
  for (let i = 0; i < 46; i++) {
    out.push(8 + ((s.charCodeAt(i % s.length) + i * 7) % 22));
  }
  return out;
}

function TicketBarcode({ seed }: { seed: string }) {
  const heights = ticketBarcodeHeights(seed);
  return (
    <div
      className="flex h-[54px] items-end justify-center gap-[1px] px-4 opacity-90"
      aria-hidden
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="shrink-0 rounded-[0.5px] bg-amber-950 dark:bg-amber-100/85"
          style={{ width: 1 + (i % 4 === 0 ? 1 : 0), height: h }}
        />
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
  mode = "placeBet",
  ticketBet = null,
}: EventOddsModalProps) {
  const isTicketMode = mode === "ticket";
  const { address } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending: isConnectingWallet } = useConnect();
  const { switchChain, switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isContractWritePending } = useWriteContract();

  const contractAddr = getSportsBettingContractAddress();

  const ticketGameId =
    isTicketMode && event && ticketBet ? String(event.id) : undefined;
  const ticketBetIdBigInt =
    isTicketMode && ticketBet ? BigInt(ticketBet.betId) : undefined;

  const {
    data: onChainGame,
    refetch: refetchGame,
    isFetching: gameChainLoading,
    error: gameReadError,
  } = useReadContract({
    address: contractAddr,
    abi: sportsBettingAbi,
    functionName: "getGame",
    args: ticketGameId ? [ticketGameId] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: Boolean(open && isTicketMode && event && ticketBet && contractAddr),
    },
  });

  const {
    data: onChainBet,
    refetch: refetchBet,
    isFetching: betChainLoading,
    error: betReadError,
  } = useReadContract({
    address: contractAddr,
    abi: sportsBettingAbi,
    functionName: "getBet",
    args: ticketBetIdBigInt !== undefined ? [ticketBetIdBigInt] : undefined,
    chainId: sepolia.id,
    query: {
      enabled: Boolean(
        open && isTicketMode && ticketBet && contractAddr && ticketBetIdBigInt !== undefined
      ),
    },
  });

  const [modalPhase, setModalPhase] = useState<"odds" | "stake">("odds");
  const [pick, setPick] = useState<0 | 1 | 2 | null>(null);
  const [quote, setQuote] = useState<BetQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [stakeEth, setStakeEth] = useState("0.001");
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [lastReportTxHash, setLastReportTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setModalPhase("odds");
      setPick(null);
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      setPlaceError(null);
      setStakeEth("0.001");
      setSettling(false);
      setSettleError(null);
      setClaimError(null);
      setLastReportTxHash(null);
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
    if (isTicketMode) return;
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
  }, [open, modalPhase, pick, bookmakersCsv, address, event?.id, isTicketMode]);

  const backToOdds = () => {
    setModalPhase("odds");
    setPick(null);
    setQuote(null);
    setQuoteError(null);
    setPlaceError(null);
  };

  const handlePlaceBet = async () => {
    setPlaceError(null);
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

  const chainGameStatus =
    onChainGame != null && onChainGame.exists ? Number(onChainGame.status) : undefined;
  const apiSettled = event?.status === "settled";
  const showReportToChain =
    isTicketMode &&
    Boolean(
      contractAddr &&
        ticketGameId &&
        apiSettled &&
        onChainGame?.exists &&
        chainGameStatus === 0 &&
        !gameChainLoading &&
        !betChainLoading
    );
  const showClaimPayout =
    isTicketMode &&
    Boolean(
      contractAddr &&
        onChainGame?.exists &&
        chainGameStatus === 1 &&
        onChainBet &&
        !onChainBet.claimed &&
        address &&
        isAddressEqual(address, onChainBet.bettor)
    );
  const moneylineTicketWon =
    ticketBet &&
    onChainGame &&
    ticketBet.betType === 0 &&
    ticketBet.outcome === Number(onChainGame.result);
  const claimDisabledNonWinner =
    showClaimPayout && ticketBet && ticketBet.betType === 0 && !moneylineTicketWon;

  const handleReportResult = async () => {
    if (!ticketGameId) return;
    setSettleError(null);
    setLastReportTxHash(null);
    setSettling(true);
    try {
      const out = await postReportResult(ticketGameId);
      if (!out.alreadySettled && "txHash" in out) {
        setLastReportTxHash(out.txHash);
      }
      await refetchGame();
      await refetchBet();
    } catch (e) {
      console.error(e);
      setSettleError(e instanceof Error ? e.message : "Report failed");
    } finally {
      setSettling(false);
    }
  };

  const handleClaimWinnings = async () => {
    setClaimError(null);
    if (!contractAddr || !ticketBet) return;
    if (chainId !== sepolia.id) {
      try {
        switchChain?.({ chainId: sepolia.id });
      } catch (e) {
        console.error(e);
        setClaimError("Switch to Sepolia in your wallet.");
      }
      return;
    }
    try {
      await writeContractAsync({
        chainId: sepolia.id,
        address: contractAddr,
        abi: sportsBettingAbi,
        functionName: "claimWinnings",
        args: [BigInt(ticketBet.betId)],
      });
      await refetchBet();
    } catch (e) {
      console.error(e);
      setClaimError(e instanceof Error ? e.message : "Claim failed");
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

  const ticketLineShown =
    isTicketMode && ticketBet
      ? formatLineForDisplay(ticketBet.betType, ticketBet.line)
      : null;

  const showTicketChrome = Boolean(isTicketMode && ticketBet && event);

  const dialogHeader = (
    <DialogHeader
      className={cn(
        "relative",
        showTicketChrome && "text-amber-950 dark:text-amber-50"
      )}
    >
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
      <DialogTitle
        className={cn(showTicketChrome && "text-xl font-bold tracking-tight text-amber-950 dark:text-amber-50")}
      >
        {eventLabel || "Event odds"}
      </DialogTitle>
      {eventMeta && (
        <DialogDescription
          className={cn(showTicketChrome && "text-amber-900/75 dark:text-amber-200/80")}
        >
          {eventMeta}
        </DialogDescription>
      )}
      {event?.date && (
        <DialogDescription
          className={cn(showTicketChrome && "text-amber-900/70 dark:text-amber-200/75")}
        >
          {new Date(event.date).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </DialogDescription>
      )}
      {showScore && (
        <DialogDescription
          className={cn(
            "text-base font-semibold",
            showTicketChrome ? "text-amber-950 dark:text-amber-50" : "text-foreground"
          )}
        >
          {formatScore(event.scores)}
        </DialogDescription>
      )}
    </DialogHeader>
  );

  const ticketBody =
    showTicketChrome && ticketBet ? (
      <div className="rounded-md border border-amber-900/20 bg-white/55 px-3 py-3 text-sm shadow-inner dark:border-amber-700/30 dark:bg-black/30">
        <dl className="grid grid-cols-[minmax(0,6.5rem)_1fr] gap-x-2 gap-y-2.5 border-b border-dashed border-amber-900/15 pb-3 dark:border-amber-700/25">
          <dt className="font-medium uppercase tracking-wide text-amber-800/80 text-[11px] dark:text-amber-300/85">
            Bet ID
          </dt>
          <dd className="font-mono text-sm font-semibold text-amber-950 dark:text-amber-50">{ticketBet.betId}</dd>
          <dt className="font-medium uppercase tracking-wide text-amber-800/80 text-[11px] dark:text-amber-300/85">
            Bettor
          </dt>
          <dd className="font-mono text-xs text-amber-950 dark:text-amber-100">{shortAddress(ticketBet.bettor)}</dd>
          <dt className="font-medium uppercase tracking-wide text-amber-800/80 text-[11px] dark:text-amber-300/85">
            Type
          </dt>
          <dd className="text-amber-950 dark:text-amber-50">{betTypeLabel(ticketBet.betType)}</dd>
          <dt className="font-medium uppercase tracking-wide text-amber-800/80 text-[11px] dark:text-amber-300/85">
            Pick
          </dt>
          <dd className="text-amber-950 dark:text-amber-50">{placedOutcomeLabel(ticketBet.betType, ticketBet.outcome)}</dd>
          {ticketLineShown !== null && (
            <>
              <dt className="font-medium uppercase tracking-wide text-amber-800/80 text-[11px] dark:text-amber-300/85">
                Line
              </dt>
              <dd className="font-mono text-amber-950 dark:text-amber-50">{ticketLineShown}</dd>
            </>
          )}
        </dl>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/75 dark:text-amber-400/80">
              Odds
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-amber-950 dark:text-amber-50">
              {decimalOddsFromChain(ticketBet.oddsTimes100)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/75 dark:text-amber-400/80">
              Stake
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-amber-950 dark:text-amber-50">
              {formatEther(ticketBet.amountWei)} <span className="text-sm font-semibold">ETH</span>
            </p>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] overflow-y-auto",
          showTicketChrome
            ? "gap-0 border-0 bg-transparent p-3 shadow-none sm:max-w-md sm:p-4"
            : "gap-4 sm:max-w-lg"
        )}
      >
        {showTicketChrome && ticketBet ? (
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border-2 border-amber-900/35 bg-gradient-to-br from-amber-50 via-[#fff7e8] to-amber-100",
              "shadow-[0_14px_44px_-10px_rgba(60,30,0,0.28),inset_0_1px_0_rgba(255,255,255,0.65)]",
              "dark:border-amber-600/40 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950",
              "dark:shadow-[0_14px_44px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]"
            )}
          >
            {settling && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-amber-950/45 px-4 text-center backdrop-blur-[2px] dark:bg-black/55"
                role="status"
                aria-live="polite"
              >
                <div
                  className="h-9 w-9 animate-spin rounded-full border-2 border-white/35 border-t-white"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-white drop-shadow-sm dark:text-amber-50">
                  Crunching the numbers…
                </p>
                {lastReportTxHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${lastReportTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-amber-100 underline underline-offset-2 hover:text-white"
                  >
                    View on Etherscan
                  </a>
                )}
              </div>
            )}
            <div className="flex h-4 w-full items-center justify-center gap-1 border-b border-dashed border-amber-900/30 bg-amber-950/[0.04] px-2 dark:border-amber-600/35 dark:bg-black/30">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="size-1 shrink-0 rounded-full bg-amber-900/35 dark:bg-amber-500/45"
                />
              ))}
            </div>
            <div className="flex min-h-0">
              <div
                className="w-2.5 shrink-0 bg-gradient-to-b from-amber-500 via-orange-600 to-amber-800 dark:from-amber-700 dark:via-amber-800 dark:to-amber-950"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-0 px-3 pb-0 pt-2.5 sm:px-4 sm:pt-3">
                <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-900/55 dark:text-amber-400/75">
                  Wager ticket
                </p>
                {dialogHeader}
                <div className="my-2.5 border-t border-dashed border-amber-900/30 dark:border-amber-600/35" />
                {ticketBody}
                <div className="my-3 border-t border-dashed border-amber-900/30 dark:border-amber-600/35" />
                <TicketBarcode seed={ticketBet.betId} />
                <p className="pb-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-amber-900/45 dark:text-amber-500/65">
                  Non-transferable · Sepolia testnet
                </p>
              </div>
              <div
                className="w-2.5 shrink-0 bg-gradient-to-b from-amber-500 via-orange-600 to-amber-800 dark:from-amber-700 dark:via-amber-800 dark:to-amber-950"
                aria-hidden
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 border-t border-amber-900/20 bg-amber-950/[0.06] px-4 py-3 dark:border-amber-700/30 dark:bg-black/35 sm:justify-center">
              {!contractAddr && (
                <p className="text-center text-xs text-amber-900/80 dark:text-amber-200/85">
                  Set NEXT_PUBLIC_CONTRACT_ADDRESS to settle or claim on-chain.
                </p>
              )}
              {(gameChainLoading || betChainLoading) && (
                <p className="text-center text-xs text-amber-900/75 dark:text-amber-200/80">
                  Loading on-chain status…
                </p>
              )}
              {(gameReadError || betReadError) && (
                <p className="text-center text-xs text-red-700 dark:text-red-300">
                  {(gameReadError && String(gameReadError.message || gameReadError)) ||
                    (betReadError && String(betReadError.message || betReadError)) ||
                    "Chain read failed"}
                </p>
              )}
              {settleError && (
                <p className="text-center text-xs text-red-700 dark:text-red-300">{settleError}</p>
              )}
              {claimError && (
                <p className="text-center text-xs text-red-700 dark:text-red-300">{claimError}</p>
              )}
              {onChainGame && !onChainGame.exists && contractAddr && !gameChainLoading && (
                <p className="text-center text-xs text-amber-900/80 dark:text-amber-200/85">
                  This game is not on the contract yet (no matching game id).
                </p>
              )}
              {showReportToChain && (
                <Button
                  type="button"
                  className="w-full border-amber-900/40 bg-amber-600 text-white hover:bg-amber-700 dark:border-amber-500/50 dark:bg-amber-700 dark:hover:bg-amber-600"
                  disabled={settling || !contractAddr}
                  onClick={() => void handleReportResult()}
                >
                  {settling ? "Reporting…" : "Report result to chain"}
                </Button>
              )}
              {showClaimPayout && (
                <>
                  {chainId !== sepolia.id && address && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => switchChain?.({ chainId: sepolia.id })}
                    >
                      Switch to Sepolia to claim
                    </Button>
                  )}
                  {claimDisabledNonWinner && (
                    <p className="text-center text-[11px] text-amber-900/75 dark:text-amber-200/80">
                      This moneyline pick did not win — claiming would revert.
                    </p>
                  )}
                  <Button
                    type="button"
                    className="w-full border-emerald-900/30 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    disabled={
                      claimDisabledNonWinner ||
                      isContractWritePending ||
                      !contractAddr ||
                      chainId !== sepolia.id
                    }
                    onClick={() => void handleClaimWinnings()}
                  >
                    {isContractWritePending ? "Confirm in wallet…" : "Claim payout"}
                  </Button>
                </>
              )}
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="min-w-[8rem] w-full border-amber-900/35 bg-white/70 font-medium text-amber-950 hover:bg-white dark:border-amber-600/45 dark:bg-stone-900/90 dark:text-amber-50 dark:hover:bg-stone-900"
                >
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <>
            {dialogHeader}

        {!isTicketMode && modalPhase === "stake" && event && (
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
                    <Button
                      type="button"
                      disabled={isContractWritePending}
                      onClick={() => void handlePlaceBet()}
                    >
                      {isContractWritePending ? "Confirm in wallet…" : "Place bet"}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {!isTicketMode && modalPhase === "odds" && (
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
