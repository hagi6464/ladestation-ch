"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { IconMapPin } from "@/components/ui/Icon";

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
  /** Programmatisch gesetzter Wert (z. B. per GPS aufgelöste Ortschaft) —
   *  zählt wie eine getroffene Auswahl und löst KEINE Suche aus. */
  committedValue?: string | null;
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
  committedValue,
}: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lastSelected, setLastSelected] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const listId = `${fieldId}-list`;

  // Programmatischen Wert als „gewählt" übernehmen (guarded Render-Anpassung),
  // damit der Such-Effekt dafür keine Trefferliste öffnet.
  const [prevCommitted, setPrevCommitted] = useState<string | null | undefined>(
    undefined,
  );
  if (committedValue !== prevCommitted) {
    setPrevCommitted(committedValue);
    if (committedValue) {
      setLastSelected(committedValue);
      setResults([]);
      setListOpen(false);
    }
  }

  useEffect(() => {
    const q = value.trim();
    if (q === lastSelected) return;
    // Veraltete Requests abbrechen (neuer Tastendruck/Unmount) — Abbruch ist
    // kein Fehler und darf keine Fehlermeldung auslösen.
    const ac = new AbortController();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setListOpen(false);
        setError(null);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { results?: GeocodeResult[] };
        setResults(data.results ?? []);
        setListOpen((data.results ?? []).length > 0);
        setActiveIndex(-1);
        setError(null);
      } catch {
        if (ac.signal.aborted) return;
        setResults([]);
        setListOpen(false);
        setError("Suche fehlgeschlagen — bitte erneut versuchen.");
      } finally {
        if (!ac.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [value, lastSelected]);

  function pick(r: GeocodeResult) {
    setLastSelected(r.label);
    onValueChange(r.label);
    setListOpen(false);
    setResults([]);
    setError(null);
    onSelect(r);
    // Auswahl getroffen → Fokus weg, damit sich die Tastatur (mobil) schliesst.
    inputRef.current?.blur();
  }

  // Tastatur-Navigation in der Trefferliste — gleiches Muster wie SearchBox.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!listOpen || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      setListOpen(false);
    }
  }

  const listVisible = listOpen && results.length > 0;

  return (
    <div className="relative">
      <SectionLabel as="label" htmlFor={fieldId}>
        {label}
      </SectionLabel>
      <div className="flex items-center gap-1 rounded-control border border-border-strong bg-field px-2 py-1.5">
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setListOpen(true)}
          onBlur={() => setTimeout(() => setListOpen(false), 150)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-base text-primary outline-none placeholder:text-tertiary"
          aria-label={ariaLabel ?? label}
          autoComplete="off"
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            listVisible && activeIndex >= 0
              ? `${listId}-opt-${activeIndex}`
              : undefined
          }
        />
        {busy && (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
        )}
        {trailing}
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
                  pick(r);
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
