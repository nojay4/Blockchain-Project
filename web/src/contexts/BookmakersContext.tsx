"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getBookmakers } from "@/lib/api";

interface BookmakersContextValue {
  bookmakers: string | null;
  loading: boolean;
  error: string | null;
  ensureBookmakers: () => Promise<string | null>;
}

const BookmakersContext = createContext<BookmakersContextValue | null>(null);

export function BookmakersProvider({ children }: { children: React.ReactNode }) {
  const [bookmakers, setBookmakers] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureBookmakers = useCallback(async (): Promise<string | null> => {
    if (bookmakers) return bookmakers;
    setLoading(true);
    setError(null);
    try {
      const value = await getBookmakers();
      setBookmakers(value);
      return value;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load bookmakers";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [bookmakers]);

  return (
    <BookmakersContext.Provider
      value={{ bookmakers, loading, error, ensureBookmakers }}
    >
      {children}
    </BookmakersContext.Provider>
  );
}

export function useBookmakers(): BookmakersContextValue {
  const ctx = useContext(BookmakersContext);
  if (!ctx) {
    throw new Error("useBookmakers must be used within BookmakersProvider");
  }
  return ctx;
}
