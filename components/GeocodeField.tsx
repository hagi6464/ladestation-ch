"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const listId = `${fieldId}-list`;

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
    // Auswahl getroffen → Fokus weg, damit sich die Tastatur (mobil) schliesst.
    inputRef.current?.blur();
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
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary hover:bg-accent-soft hover:text-primary"
              >
                <IconMapPin size={14} className="shrink-0 text-tertiary" />
                <span className="truncate">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
