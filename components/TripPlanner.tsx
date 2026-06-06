"use client";

import { useEffect, useRef, useState } from "react";
import type { CorridorStation, TripRoute } from "@/lib/types";
import { findCpoTariff, type CpoTariff } from "@/lib/cpo-tariffs";
import { estimateChargeMinutes } from "@/lib/vehicle";

export type TripDestination = { lat: number; lon: number; label: string };
type GeocodeResult = { lat: number; lon: number; zoom: number; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Start = GPS-Standort; ohne ihn ist keine Planung möglich. */
  hasLocation: boolean;
  vehicleName: string;
  soc: number;
  onSocChange: (n: number) => void;
  consumption: number;
  onConsumptionChange: (n: number) => void;
  bufferKm: number;
  onBufferChange: (n: number) => void;
  /** Live errechnete Reichweite (vom Parent aus SoC/Verbrauch). */
  rangeKm: number;
  onPlan: (destination: TripDestination) => void;
  onClear: () => void;
  loading: boolean;
  error: string | null;
  route: TripRoute | null;
  stops: CorridorStation[];
  selectedStopIds: string[];
  onToggleStop: (evseId: string) => void;
  onOpenInMaps: () => void;
  onOpenInApple: () => void;
};

/** Günstigster hinterlegter DC-Preis eines Betreibers (kuratiert, ggf. veraltet). */
function minDcPerKwh(cpo: CpoTariff): number | null {
  const prices = cpo.tariffs
    .map((t) => t.dcPerKwh)
    .filter((p): p is number => p != null);
  return prices.length ? Math.min(...prices) : null;
}

export function TripPlanner({
  open,
  onClose,
  hasLocation,
  vehicleName,
  soc,
  onSocChange,
  consumption,
  onConsumptionChange,
  bufferKm,
  onBufferChange,
  rangeKm,
  onPlan,
  onClear,
  loading,
  error,
  route,
  stops,
  selectedStopIds,
  onToggleStop,
  onOpenInMaps,
  onOpenInApple,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [destination, setDestination] = useState<TripDestination | null>(null);
  const lastSelected = useRef<string>("");

  // Ziel-Geocoding (gleicher Endpoint wie die Hauptsuche).
  useEffect(() => {
    const q = query.trim();
    if (q === lastSelected.current) return;
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setListOpen(false);
        return;
      }
      setGeoBusy(true);
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
        setGeoBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function selectResult(r: GeocodeResult) {
    lastSelected.current = r.label;
    setQuery(r.label);
    setListOpen(false);
    setResults([]);
    setDestination({ lat: r.lat, lon: r.lon, label: r.label });
  }

  if (!open) return null;

  const reachWithoutCharge =
    route != null && route.distanceKm <= rangeKm - bufferKm;

  return (
    <aside
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-auto sm:max-h-[82vh] sm:w-96 sm:rounded-2xl"
      aria-label="Reiseplaner"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Reise planen
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Standard: {vehicleName} — Verbrauch anpassbar
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Schliessen"
        >
          ✕
        </button>
      </div>

      {!hasLocation && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          Zuerst über das 📍-Symbol in der Suche den Standort setzen — er ist der
          Startpunkt der Route.
        </div>
      )}

      <div className="space-y-3">
        {/* Start */}
        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-white bg-blue-600 shadow" />
          <span className="font-medium">Start:</span>
          <span className="text-zinc-600 dark:text-zinc-300">
            Mein Standort
          </span>
        </div>

        {/* Ziel */}
        <div className="relative">
          <label className="mb-1 block text-xs uppercase text-zinc-500">
            Ziel
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDestination(null);
              }}
              onFocus={() => results.length > 0 && setListOpen(true)}
              onBlur={() => setTimeout(() => setListOpen(false), 150)}
              placeholder="Zielort oder Adresse…"
              className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
              aria-label="Zielort"
              autoComplete="off"
            />
            {geoBusy && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
            )}
          </div>
          {listOpen && results.length > 0 && (
            <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {results.map((r, idx) => (
                <li key={`${r.label}-${idx}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectResult(r);
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

        {/* Ladezustand */}
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-xs uppercase text-zinc-500">
              Ladezustand
            </label>
            <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {soc}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={soc}
            onChange={(e) => onSocChange(Number(e.target.value))}
            className="w-full accent-emerald-600"
            aria-label="Ladezustand in Prozent"
          />
          <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            Reichweite ≈{" "}
            <span className="font-semibold tabular-nums">
              {Math.round(rangeKm)} km
            </span>{" "}
            (Puffer {bufferKm} km)
          </div>
        </div>

        {/* Verbrauch + Puffer */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-zinc-500">
              Verbrauch
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
              <input
                type="number"
                min={8}
                max={40}
                step={0.5}
                value={consumption}
                onChange={(e) => onConsumptionChange(Number(e.target.value))}
                className="min-w-0 flex-1 bg-transparent outline-none dark:text-zinc-50"
                aria-label="Verbrauch in kWh pro 100 km"
              />
              <span className="shrink-0 text-[11px] text-zinc-500">
                kWh/100&nbsp;km
              </span>
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-zinc-500">
              Puffer
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={bufferKm}
                onChange={(e) => onBufferChange(Number(e.target.value))}
                className="min-w-0 flex-1 bg-transparent outline-none dark:text-zinc-50"
                aria-label="Sicherheitspuffer in km"
              />
              <span className="shrink-0 text-[11px] text-zinc-500">km</span>
            </span>
          </label>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!hasLocation || !destination || loading}
            onClick={() => destination && onPlan(destination)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            )}
            Route planen
          </button>
          {route && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Zurücksetzen
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Ergebnis */}
      {route && (
        <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-700 dark:text-zinc-200">
            <span className="font-semibold tabular-nums">
              {Math.round(route.distanceKm)} km
            </span>
            <span className="text-zinc-400">·</span>
            <span className="tabular-nums">
              ≈ {formatDuration(route.durationMin)}
            </span>
          </div>

          {reachWithoutCharge ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              ✓ Ziel ohne Nachladen erreichbar (Reichweite minus Puffer reicht).
            </div>
          ) : (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Nachladen nötig — Ladesäulen entlang der Route (grau = ausserhalb
              der Reichweite):
            </div>
          )}

          {stops.length > 0 && (
            <ul className="space-y-1.5">
              {stops.map((s) => {
                const selected = selectedStopIds.includes(s.properties.evseId);
                const cpo = findCpoTariff(s.properties.operatorName);
                const dc = cpo ? minDcPerKwh(cpo) : null;
                const chargeMin = Math.round(
                  estimateChargeMinutes(s.properties.maxPowerKw) / 5,
                ) * 5;
                return (
                  <li key={s.properties.evseId}>
                    <button
                      type="button"
                      onClick={() => onToggleStop(s.properties.evseId)}
                      className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        selected
                          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/50"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                      } ${s.reachable ? "" : "opacity-60"}`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                        aria-hidden="true"
                      >
                        {selected && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {s.properties.name ?? "Ladestation"}
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                            nach {Math.round(s.alongKm)} km
                          </span>
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                          {s.properties.maxPowerKw != null && (
                            <span className="font-semibold tabular-nums">
                              {s.properties.maxPowerKw} kW
                            </span>
                          )}
                          <span className="text-zinc-400">·</span>
                          <span>≈ {chargeMin} min</span>
                          {dc != null && (
                            <>
                              <span className="text-zinc-400">·</span>
                              <span className="tabular-nums">
                                ab {dc.toFixed(2)} CHF/kWh
                              </span>
                            </>
                          )}
                          {!s.reachable && (
                            <span className="rounded bg-zinc-200 px-1 text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                              ausser Reichweite
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {stops.length === 0 && !reachWithoutCharge && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              Keine passenden CCS-Schnelllader direkt am Korridor gefunden.
            </div>
          )}

          <button
            type="button"
            onClick={onOpenInMaps}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            In Google Maps öffnen
          </button>

          <button
            type="button"
            onClick={onOpenInApple}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            In Apple Karten (nächster Stopp)
          </button>

          <p className="text-[11px] leading-relaxed text-zinc-400">
            Grobe Orientierung ohne Gewähr — Verbrauch/Reichweite je nach Tempo,
            Wetter und Höhe verschieden. Google Maps übernimmt auf dem Handy max.
            3 Zwischenstopps; Apple Karten nur den nächsten Stopp.
          </p>
        </div>
      )}
    </aside>
  );
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}
