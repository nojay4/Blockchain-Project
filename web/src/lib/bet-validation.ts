/**
 * Bet validation utilities for determining which bets can be settled
 * using only final game scores (home/away).
 */

import type { OddsEntry } from "@/types/sports";

/**
 * Sports that can be settled with final scores.
 * These slugs are matched as substrings to handle API variations.
 */
export const SUPPORTED_SPORT_SLUGS = [
  "soccer",
  "football", // European football / soccer
  "basketball",
  "ice_hockey",
  "hockey",
  "baseball",
  "american_football",
] as const;

/**
 * Valid full-game market names (case-insensitive).
 * Excludes halftime (HT), quarter (Q1, 1Q), period-specific markets.
 */
export const VALID_MARKET_NAMES = ["ml", "spread", "totals"] as const;

/**
 * Check if a sport slug is supported for betting.
 * Uses substring matching to handle API variations (e.g., "usa-basketball" matches "basketball").
 */
export function isSupportedSport(slug: string | undefined): boolean {
  if (!slug) return false;
  const lowerSlug = slug.toLowerCase();
  return SUPPORTED_SPORT_SLUGS.some((s) => lowerSlug.includes(s));
}

/**
 * Check if a market name is a valid full-game market.
 * Only "ML", "Spread", "Totals" are valid - NOT "ML HT", "Spread Q1", etc.
 */
export function isFullGameMarket(marketName: string | undefined): boolean {
  if (!marketName) return false;
  const normalized = marketName.toLowerCase().trim();
  return VALID_MARKET_NAMES.includes(normalized as typeof VALID_MARKET_NAMES[number]);
}

/**
 * Determine the bet type from an OddsEntry based on its data structure.
 */
export type BetType = "moneyline" | "spread" | "totals" | "player_prop" | "unknown";

export function getBetType(entry: OddsEntry): BetType {
  // Player props always have a label
  if (entry.label) {
    return "player_prop";
  }

  const hasHomeAway = entry.home || entry.away;
  const hasOverUnder = entry.over || entry.under;
  const hasHdp = entry.hdp != null;

  // Spread: home/away with handicap line
  if (hasHomeAway && hasHdp) {
    return "spread";
  }

  // Moneyline: home/away without handicap
  if (hasHomeAway && !hasHdp) {
    return "moneyline";
  }

  // Totals: over/under (with hdp as the line number)
  if (hasOverUnder && !hasHomeAway) {
    return "totals";
  }

  return "unknown";
}

/**
 * Check if a bet entry can be settled with just final scores.
 * Returns true for ML, Spread, and Totals (no player props).
 */
export function isSettleableBetType(entry: OddsEntry): boolean {
  const betType = getBetType(entry);
  return betType === "moneyline" || betType === "spread" || betType === "totals";
}

/**
 * Full validation: sport is supported AND market is full-game AND bet type is settleable.
 */
export function isBetValid(
  sportSlug: string | undefined,
  marketName: string | undefined,
  entry: OddsEntry
): boolean {
  return (
    isSupportedSport(sportSlug) &&
    isFullGameMarket(marketName) &&
    isSettleableBetType(entry)
  );
}
