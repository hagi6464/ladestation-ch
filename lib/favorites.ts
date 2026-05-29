"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ladestation-favorites";
const EVENT_NAME = "ladestation-favorites-changed";

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    // fall through
  }
  return new Set();
}

function writeStorage(set: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function toggleFavorite(id: string): void {
  const set = readStorage();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  writeStorage(set);
}

export type FavoritesState = {
  ids: Set<string>;
  count: number;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
};

export function useFavorites(): FavoritesState {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => setIds(readStorage());
    const t = setTimeout(refresh, 0);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  return {
    ids,
    count: ids.size,
    isFavorite: (id) => ids.has(id),
    toggle: toggleFavorite,
  };
}
