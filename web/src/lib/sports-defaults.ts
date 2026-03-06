/**
 * Default league slug per sport when navigating from the Sports menu.
 * Keys must match sport slugs returned by the API (e.g. getSports()).
 */
export const DEFAULT_LEAGUE_BY_SPORT: Record<string, string> = {
  basketball: "usa-nba",
  american_football: "usa-nfl",
  ice_hockey: "usa-nhl",
};

export function getDefaultLeagueForSport(sportSlug: string): string | undefined {
  return DEFAULT_LEAGUE_BY_SPORT[sportSlug];
}
