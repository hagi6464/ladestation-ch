"use client";

import { useEffect } from "react";
import { useFavorites } from "@/lib/favorites";
import { PlugIcon, type PlugType } from "@/components/PlugIcon";
import { PLUG_FILTER_LABELS } from "@/lib/plugs";
import type { Filters } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (next: Filters) => void;
  hasLocation: boolean;
};

const POWER_PRESETS = [0, 22, 50, 150];
const RANGE_PRESETS = [0, 50, 75, 100, 200];

const PLUG_FILTER_ICON: Record<"type2" | "ccs" | "chademo", PlugType> = {
  type2: "type2",
  ccs: "ccs2",
  chademo: "chademo",
};

const PILL_ACTIVE = "bg-blue-600 text-white";
const PILL_IDLE =
  "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

const DEFAULT_FILTERS: Filters = {
  minPower: 0,
  current: "any",
  plugType: "any",
  favoritesOnly: false,
  rangeKm: 0,
};

function pill(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm transition-colors ${
    active ? PILL_ACTIVE : PILL_IDLE
  }`;
}

/** Anzahl aktiver Filter (für das Badge am Filter-Chip wiederverwendbar). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.current !== "any" ? 1 : 0) +
    (f.minPower > 0 ? 1 : 0) +
    (f.plugType !== "any" ? 1 : 0) +
    (f.rangeKm > 0 ? 1 : 0) +
    (f.favoritesOnly ? 1 : 0)
  );
}

export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  hasLocation,
}: Props) {
  const { count: favoriteCount } = useFavorites();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const count = activeFilterCount(filters);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filter"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Filter
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="mb-1.5 text-xs uppercase text-zinc-500">Strom</h3>
            <div className="flex flex-wrap gap-1.5">
              {(["any", "ac", "dc"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...filters, current: c })}
                  className={pill(filters.current === c)}
                >
                  {c === "any" ? "Alle" : c.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-xs uppercase text-zinc-500">Leistung</h3>
            <div className="flex flex-wrap gap-1.5">
              {POWER_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ ...filters, minPower: p })}
                  className={pill(filters.minPower === p)}
                >
                  {p === 0 ? "alle" : `≥ ${p} kW`}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-xs uppercase text-zinc-500">Stecker</h3>
            <div className="flex flex-wrap gap-1.5">
              {(["any", "type2", "ccs", "chademo"] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => onChange({ ...filters, plugType: pt })}
                  className={`inline-flex items-center gap-1 ${pill(
                    filters.plugType === pt,
                  )}`}
                >
                  {pt === "any" ? (
                    "alle"
                  ) : (
                    <>
                      <PlugIcon
                        type={PLUG_FILTER_ICON[pt]}
                        width={14}
                        height={14}
                        aria-hidden="true"
                      />
                      {PLUG_FILTER_LABELS[pt]}
                    </>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-xs uppercase text-zinc-500">
              Reichweite um meinen Standort
            </h3>
            {hasLocation ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {RANGE_PRESETS.map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => onChange({ ...filters, rangeKm: km })}
                      className={pill(filters.rangeKm === km)}
                    >
                      {km === 0 ? "aus" : `${km} km`}
                    </button>
                  ))}
                </div>
                {filters.rangeKm > 0 && (
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Distanz = Luftlinie (nicht Fahrstrecke).
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                📍 Zuerst über das Standort-Symbol in der Suche den Standort
                setzen.
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-1.5 text-xs uppercase text-zinc-500">Favoriten</h3>
            <button
              type="button"
              onClick={() =>
                onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
              }
              disabled={favoriteCount === 0 && !filters.favoritesOnly}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                filters.favoritesOnly ? "bg-amber-500 text-white" : PILL_IDLE
              }`}
            >
              <svg
                width="14"
                height="14"
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
              Nur Favoriten
              {favoriteCount > 0 && (
                <span className="tabular-nums">({favoriteCount})</span>
              )}
            </button>
          </section>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            disabled={count === 0}
            className="text-sm text-zinc-500 underline-offset-2 hover:underline disabled:opacity-40 dark:text-zinc-400"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
