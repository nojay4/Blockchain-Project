"use client";

import { useEffect, useState } from "react";
import { getGames, type Game } from "@/lib/api";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function Home() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGames()
      .then(setGames)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load games"));
  }, []);

  if (error) {
    return (
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1>Sports Betting PoC</h1>
        <p style={{ color: "crimson" }}>{error}</p>
        <p>Make sure the backend is running (e.g. ./run.sh or flask run --port 8000 in oracle/).</p>
      </main>
    );
  }

  if (games === null) {
    return (
      <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1>Sports Betting PoC</h1>
        <p>Loading games…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Sports Betting PoC</h1>
      <p style={{ marginBottom: "1.5rem" }}>
        Decentralized sports prediction market — connect wallet, view games, place bets.
      </p>

      <section>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Upcoming games</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {games.map((g) => (
            <li
              key={g.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1rem 1.25rem",
                marginBottom: "0.75rem",
                backgroundColor: "#fafafa",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                {g.home_team} vs {g.away_team}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}>
                {formatTime(g.start_time)} · {g.status}
              </div>
              <div style={{ fontSize: "0.9rem" }}>
                Odds: Home {g.odds.home_win} | Draw {g.odds.draw} | Away {g.odds.away_win}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
