import type { ListBetsBetRaw } from "@/types/sports";

const BET_TYPE_MONEYLINE = 0;
const BET_TYPE_SPREAD = 1;
const BET_TYPE_TOTAL = 2;

export function betTypeLabel(betType: number): string {
  if (betType === BET_TYPE_MONEYLINE) return "Moneyline";
  if (betType === BET_TYPE_SPREAD) return "Spread";
  if (betType === BET_TYPE_TOTAL) return "Total";
  return "Unknown";
}

export function outcomeLabel(betType: number, outcome: number): string {
  if (betType === BET_TYPE_MONEYLINE) {
    if (outcome === 0) return "Home";
    if (outcome === 1) return "Away";
    if (outcome === 2) return "Draw";
    return "—";
  }
  if (betType === BET_TYPE_SPREAD) {
    if (outcome === 0) return "Home covers";
    if (outcome === 1) return "Away covers";
    return "—";
  }
  if (betType === BET_TYPE_TOTAL) {
    if (outcome === 0) return "Over";
    if (outcome === 1) return "Under";
    return "—";
  }
  return "—";
}

/** Contract stores spread/total line × 10; moneyline uses 0. */
export function formatLineForDisplay(betType: number, line: number): string | null {
  if (betType === BET_TYPE_MONEYLINE) return null;
  const n = line / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function ticketCardSubtitle(bet: ListBetsBetRaw): string {
  const type = betTypeLabel(bet.bet_type);
  const side = outcomeLabel(bet.bet_type, bet.outcome);
  return `${type} · ${side}`;
}

export function toBigIntWei(v: number | string): bigint {
  return BigInt(String(v));
}

/** On-chain odds are decimal odds × 100 (e.g. 191 → 1.91). */
export function decimalOddsFromChain(oddsWei: bigint): string {
  const scale = BigInt(100);
  const whole = oddsWei / scale;
  const cent = oddsWei % scale;
  return `${whole}.${cent.toString().padStart(2, "0")}`;
}
