/**
 * Default league slug per sport when navigating from the Sports menu.
 * Keys match API sport slugs: basketball, american-football, ice-hockey.
 */
const DEFAULT_LEAGUE_BY_SPORT: Record<string, string> = {
  basketball: "usa-nba",
  "american-football": "usa-nfl",
  "ice-hockey": "usa-nhl",
};

export function getDefaultLeagueForSport(sportSlug: string): string | undefined {
  return sportSlug ? DEFAULT_LEAGUE_BY_SPORT[sportSlug] : undefined;
}
