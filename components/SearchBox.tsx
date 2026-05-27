"use client";

import { useState } from "react";

export type FlyTarget = { lat: number; lon: number; zoom: number };

type Props = {
  onLocate: (target: FlyTarget) => void;
};

async function geocode(query: string): Promise<FlyTarget | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
  const data = (await res.json()) as { result: FlyTarget | null };
  return data.result;
}

export function SearchBox({ onLocate }: Props) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const target = await geocode(q);
      if (!target) {
        setError("Kein Ort gefunden.");
        return;
      }
      onLocate(target);
    } catch {
      setError("Suche fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  function handleLocate() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Standort wird von diesem Browser nicht unterstützt.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onLocate({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          zoom: 14,
        });
      },
      (err) => {
        setBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Standortfreigabe wurde verweigert.");
        } else {
          setError("Standort konnte nicht ermittelt werden.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="w-full sm:w-80">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ort oder Adresse suchen…"
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          aria-label="Ort oder Adresse suchen"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Suchen"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleLocate}
          disabled={busy}
          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-blue-600 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Mein Standort"
          title="Mein Standort"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </form>
      {error && (
        <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 shadow dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
