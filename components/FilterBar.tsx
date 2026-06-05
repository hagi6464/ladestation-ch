"use client";

import { useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { PlugIcon, type PlugType } from "@/components/PlugIcon";
import { PLUG_FILTER_LABELS } from "@/lib/plugs";
import type { Filters } from "@/lib/types";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  hasLocation: boolean;
};

const POWER_PRESETS = [0, 22, 50, 150];
const RANGE_PRESETS = [0, 50, 75, 100, 200];

// Repräsentatives Icon je Filter-Kategorie (CCS → Combo-2-Variante)
const PLUG_FILTER_ICON: Record<"type2" | "ccs" | "chademo", PlugType> = {
  type2: "type2",
  ccs: "ccs2",
  chademo: "chademo",
};

const PILL_ACTIVE = "bg-blue-600 text-white";
const PILL_IDLE =
  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

export function FilterBar({ filters, onChange, hasLocation }: Props) {
  const { count: favoriteCount } = useFavorites();
  const [plugsOpen, setPlugsOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-sm shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
      <span className="font-medium text-zinc-700 dark:text-zinc-200">
        Filter:
      </span>

      <div className="flex items-center gap-1">
        {(["any", "ac", "dc"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ ...filters, current: c })}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filters.current === c ? PILL_ACTIVE : PILL_IDLE
            }`}
          >
            {c === "any" ? "Alle" : c.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
        }
        disabled={favoriteCount === 0 && !filters.favoritesOnly}
        title={
          favoriteCount === 0
            ? "Keine Favoriten gespeichert"
            : filters.favoritesOnly
              ? "Favoriten-Filter aus"
              : "Nur Favoriten zeigen"
        }
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          filters.favoritesOnly ? "bg-amber-500 text-white" : PILL_IDLE
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={filters.favoritesOnly ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Favoriten
        {favoriteCount > 0 && (
          <span className="rounded-full bg-black/10 px-1.5 text-[10px] tabular-nums dark:bg-white/10">
            {favoriteCount}
          </span>
        )}
      </button>

      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">ab kW:</span>
        {POWER_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...filters, minPower: p })}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filters.minPower === p ? PILL_ACTIVE : PILL_IDLE
            }`}
          >
            {p === 0 ? "alle" : `≥${p}`}
          </button>
        ))}
      </div>

      {/* Stecker-Filter: eingeklappt hinter ▾, spart Platz (v.a. mobil).
          Toggle wird blau, wenn ein Stecker-Filter aktiv ist. */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPlugsOpen((v) => !v)}
          aria-expanded={plugsOpen}
          aria-label="Stecker-Filter ein-/ausklappen"
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
            filters.plugType !== "any" ? PILL_ACTIVE : PILL_IDLE
          }`}
        >
          Stecker
          <span
            aria-hidden="true"
            className={`text-[10px] transition-transform ${plugsOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {plugsOpen &&
          (["any", "type2", "ccs", "chademo"] as const).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => onChange({ ...filters, plugType: pt })}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                filters.plugType === pt ? PILL_ACTIVE : PILL_IDLE
              }`}
            >
              {pt === "any" ? (
                "alle"
              ) : (
                <>
                  <PlugIcon
                    type={PLUG_FILTER_ICON[pt]}
                    width={13}
                    height={13}
                    aria-hidden="true"
                  />
                  {PLUG_FILTER_LABELS[pt]}
                </>
              )}
            </button>
          ))}
      </div>

      {/* Reichweiten-Filter: Kreis um den Standort, Säulen ausserhalb gedimmt.
          Eingeklappt hinter ▾; Toggle wird blau, wenn aktiv. */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setRangeOpen((v) => !v)}
          aria-expanded={rangeOpen}
          aria-label="Reichweiten-Filter ein-/ausklappen"
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
            filters.rangeKm > 0 ? PILL_ACTIVE : PILL_IDLE
          }`}
        >
          Reichweite
          <span
            aria-hidden="true"
            className={`text-[10px] transition-transform ${rangeOpen ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {rangeOpen &&
          (hasLocation ? (
            RANGE_PRESETS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => onChange({ ...filters, rangeKm: km })}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filters.rangeKm === km ? PILL_ACTIVE : PILL_IDLE
                }`}
              >
                {km === 0 ? "aus" : `${km} km`}
              </button>
            ))
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              📍 Zuerst Standort setzen
            </span>
          ))}
      </div>

      {filters.rangeKm > 0 && (
        <div className="flex w-full items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="truncate whitespace-nowrap">
            Distanz = Luftlinie (nicht Fahrstrecke)
          </span>
        </div>
      )}
    </div>
  );
}
