"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cu-sportsbetting-theme";

function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
  return stored ?? "dark";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: "2.5rem",
        height: "2.5rem",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--foreground)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.25rem",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
