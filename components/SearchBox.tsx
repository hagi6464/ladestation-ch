"use client";

import { useEffect, useRef, useState } from "react";
import { requestUserLocation } from "@/lib/geolocate";

export type FlyTarget = { lat: number; lon: number; zoom: number };
type GeocodeResult = FlyTarget & { label: string };

type Props = {
  onLocate: (target: FlyTarget) => void;
  onUserLocation?: (loc: { lat: number; lon: number; accuracy: number }) => void;
};

export function SearchBox({ onLocate, onUserLocation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastSelected = useRef<string>("");

  useEffect(() => {
    const q = query.trim();
    if (q === lastSelected.current) return;

    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          results: GeocodeResult[];
          outOfArea?: boolean;
        };
        const list = data.results ?? [];
        setResults(list);
        setActiveIndex(-1);
        if (list.length === 0 && data.outOfArea) {
          setOpen(false);
          setError(
            "Für dieses Gebiet liegen keine Ladesäulen-Daten vor (abgedeckt: Schweiz, Liechtenstein und ~40 km Grenzregion).",
          );
        } else {
          setOpen(true);
        }
      } catch {
        setError("Suche fehlgeschlagen. Bitte erneut versuchen.");
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function select(r: GeocodeResult) {
    lastSelected.current = r.label;
    setQuery(r.label);
    setOpen(false);
    setResults([]);
    setError(null);
    onLocate({ lat: r.lat, lon: r.lon, zoom: r.zoom });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleLocate() {
    setError(null);
    setBusy(true);
    requestUserLocation()
      .then((loc) => {
        setBusy(false);
        onUserLocation?.(loc);
        onLocate({ lat: loc.lat, lon: loc.lon, zoom: 14 });
      })
      .catch((e: unknown) => {
        setBusy(false);
        setError(
          e instanceof Error
            ? e.message
            : "Standort konnte nicht ermittelt werden.",
        );
      });
  }

  return (
    <div className="relative w-full sm:w-80">
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ort oder Adresse suchen…"
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          aria-label="Ort oder Adresse suchen"
          autoComplete="off"
        />
        {busy && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600"
            aria-hidden="true"
          />
        )}
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
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((r, idx) => (
            <li key={`${r.label}-${idx}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(r);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  idx === activeIndex
                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-zinc-400"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 shadow dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
