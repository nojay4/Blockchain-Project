const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface GameOdds {
  home_win: number;
  away_win: number;
  draw: number;
}

export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string;
  odds: GameOdds;
}

export async function getGames(): Promise<Game[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to load games");
  return res.json();
}

export async function getGame(id: string): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${id}`);
  if (!res.ok) throw new Error("Game not found");
  return res.json();
}
