"use client";

import { useEffect, useId, useRef, useState } from "react";
import { requestUserLocation } from "@/lib/geolocate";
import { IconButton } from "@/components/ui/IconButton";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { IconLocate, IconMapPin, IconSearch } from "@/components/ui/Icon";

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
  const listId = useId();

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

  const listVisible = open && results.length > 0;

  return (
    <div className="relative w-full sm:w-80">
      <div className="flex items-center gap-1 rounded-control border border-border bg-surface/95 px-2 py-1.5 shadow-popover backdrop-blur">
        <IconSearch size={16} className="shrink-0 text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ort oder Adresse suchen…"
          className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-primary outline-none placeholder:text-tertiary"
          aria-label="Ort oder Adresse suchen"
          autoComplete="off"
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
        />
        {busy && (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent"
            aria-hidden="true"
          />
        )}
        <IconButton label="Mein Standort" onClick={handleLocate} disabled={busy}>
          <IconLocate size={18} />
        </IconButton>
      </div>

      {listVisible && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-popover border border-border bg-surface shadow-popover"
        >
          {results.map((r, idx) => (
            <li key={`${r.label}-${idx}`}>
              <button
                type="button"
                id={`${listId}-opt-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(r);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  idx === activeIndex
                    ? "bg-accent-soft text-primary"
                    : "text-secondary"
                }`}
              >
                <IconMapPin size={14} className="shrink-0 text-tertiary" />
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <InfoCallout tone="danger" className="mt-1">
          {error}
        </InfoCallout>
      )}
    </div>
  );
}
