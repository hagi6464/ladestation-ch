"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type GeocodeResult = {
  lat: number;
  lon: number;
  zoom: number;
  label: string;
};

type Props = {
  label: string;
  placeholder: string;
  /** Kontrollierter Text (Label). */
  value: string;
  onValueChange: (v: string) => void;
  /** Aufgerufen, wenn ein Treffer gewählt wurde. */
  onSelect: (r: GeocodeResult) => void;
  /** Optionales Element rechts im Feld (z. B. ein Zurücksetzen-Knopf). */
  trailing?: ReactNode;
  ariaLabel?: string;
};

/**
 * Wiederverwendbares Geocode-Autocomplete-Feld (gleicher Endpoint wie die Hauptsuche).
 * Verwaltet Trefferliste/Busy intern; Text wird vom Parent kontrolliert.
 */
export function GeocodeField({
  label,
  placeholder,
  value,
  onValueChange,
  onSelect,
  trailing,
  ariaLabel,
}: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastSelected = useRef<string>("");

  useEffect(() => {
    const q = value.trim();
    if (q === lastSelected.current) return;
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setListOpen(false);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { results?: GeocodeResult[] };
        setResults(data.results ?? []);
        setListOpen((data.results ?? []).length > 0);
      } catch {
        setResults([]);
        setListOpen(false);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  function pick(r: GeocodeResult) {
    lastSelected.current = r.label;
    onValueChange(r.label);
    setListOpen(false);
    setResults([]);
    onSelect(r);
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs uppercase text-zinc-500">
        {label}
      </label>
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => results.length > 0 && setListOpen(true)}
          onBlur={() => setTimeout(() => setListOpen(false), 150)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          aria-label={ariaLabel ?? label}
          autoComplete="off"
        />
        {busy && (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        )}
        {trailing}
      </div>
      {listOpen && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((r, idx) => (
            <li key={`${r.label}-${idx}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-blue-50 dark:text-zinc-200 dark:hover:bg-blue-950"
              >
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
