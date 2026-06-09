"use client";

import { useState } from "react";
import type { CorridorStation, TripRoute } from "@/lib/types";
import { findCpoTariff, type CpoTariff } from "@/lib/cpo-tariffs";
import {
  estimateChargeMinutes,
  chargeWindowKm,
  type ChargePref,
} from "@/lib/vehicle";
import { GeocodeField, type GeocodeResult } from "@/components/GeocodeField";

export type { ChargePref };
export type TripDestination = { lat: number; lon: number; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** true, wenn ein Start (GPS oder manuell eingegeben) vorhanden ist. */
  canPlan: boolean;
  /** Manuellen Start setzen bzw. zurücksetzen (zurückgesetzt = GPS verwenden). */
  onStartSelect: (s: TripDestination) => void;
  onStartClear: () => void;
  vehicleName: string;
  soc: number;
  onSocChange: (n: number) => void;
  consumption: number;
  onConsumptionChange: (n: number) => void;
  /** Gewünschter Ladestand bei Ankunft (%). */
  arrivalSoc: number;
  onArrivalSocChange: (n: number) => void;
  /** Reserve-km, die für den Ankunfts-Ladestand zurückgehalten werden (vom Parent). */
  reserveKm: number;
  /** Nur Schnelllader (>100 kW) praktisch ohne Umweg an der Route. */
  highwayOnly: boolean;
  onHighwayOnlyChange: (b: boolean) => void;
  chargePref: ChargePref;
  onChargePrefChange: (p: ChargePref) => void;
  /** Empfohlener Stopp (sanfte Vorauswahl) für das gewählte Reise-Drittel. */
  suggestedStopId: string | null;
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

const CHARGE_PREF_LABELS: Record<ChargePref, string> = {
  start: "Anfang",
  middle: "Mitte",
  end: "Ende",
};

/** Seitlicher Umweg kompakt: < 1 km in Metern, sonst in km. */
function formatDetour(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Auswahlbereiche für die Drehrad-Eingaben (native <select> = iOS-Picker, kein Auto-Zoom).
const CONSUMPTION_OPTIONS = Array.from({ length: 31 }, (_, i) => 10 + i); // 10–40 kWh/100 km
const ARRIVAL_OPTIONS = Array.from({ length: 14 }, (_, i) => 15 + i * 5); // 15–80 %

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
  canPlan,
  onStartSelect,
  onStartClear,
  vehicleName,
  soc,
  onSocChange,
  consumption,
  onConsumptionChange,
  arrivalSoc,
  onArrivalSocChange,
  reserveKm,
  highwayOnly,
  onHighwayOnlyChange,
  chargePref,
  onChargePrefChange,
  suggestedStopId,
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
  const [destination, setDestination] = useState<TripDestination | null>(null);
  const [startQuery, setStartQuery] = useState("");

  if (!open) return null;

  const reachWithoutCharge =
    route != null && route.distanceKm <= rangeKm - reserveKm;

  // Entfernungsfenster ab Start für die gewählte Lade-Position (relativ zur Reichweite).
  const [winLo, winHi] = chargeWindowKm(chargePref, rangeKm);

  return (
    <aside
      className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 max-sm:landscape:inset-y-0 max-sm:landscape:right-auto max-sm:landscape:w-[62%] max-sm:landscape:max-w-md max-sm:landscape:rounded-r-2xl max-sm:landscape:border-r sm:inset-y-4 sm:left-4 sm:right-auto sm:bottom-4 sm:w-96 sm:rounded-2xl sm:border"
      aria-label="Reiseplaner"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Reise planen
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Schliessen"
        >
          ✕
        </button>
      </div>

      {/* Nur auf dem Handy im Hochformat: Hinweis aufs Querformat. */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 sm:hidden landscape:hidden">
        <span aria-hidden="true" className="text-sm">
          📱↻
        </span>
        Tipp: Gerät um 90° drehen (Querformat), damit Karte und Planer
        nebeneinander sichtbar sind.
      </div>

      {!canPlan && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          Standort wird automatisch abgefragt — oder oben einen Start eingeben.
        </div>
      )}

      <div className="space-y-3">
        {/* Start (GPS-Standard oder manuell eingegeben) */}
        <GeocodeField
          label="Start"
          placeholder="Mein Standort (GPS)"
          value={startQuery}
          onValueChange={(v) => {
            setStartQuery(v);
            onStartClear();
          }}
          onSelect={(r: GeocodeResult) =>
            onStartSelect({ lat: r.lat, lon: r.lon, label: r.label })
          }
          ariaLabel="Startort"
          trailing={
            startQuery ? (
              <button
                type="button"
                onClick={() => {
                  setStartQuery("");
                  onStartClear();
                }}
                aria-label="Start zurücksetzen (mein Standort)"
                className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            ) : undefined
          }
        />

        {/* Ziel */}
        <GeocodeField
          label="Ziel"
          placeholder="Zielort oder Adresse…"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setDestination(null);
          }}
          onSelect={(r: GeocodeResult) =>
            setDestination({ lat: r.lat, lon: r.lon, label: r.label })
          }
          ariaLabel="Zielort"
        />

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
            (Reserve ≈ {Math.round(reserveKm)} km für {arrivalSoc}% am Ziel)
          </div>
        </div>

        {/* Verbrauch + Ankunft (Drehrad/Select — kein iOS-Auto-Zoom) */}
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Standard: {vehicleName} — anpassbar
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-zinc-500">
              Verbrauch
            </span>
            <select
              value={consumption}
              onChange={(e) => onConsumptionChange(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-base text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              aria-label="Verbrauch in kWh pro 100 km"
            >
              {CONSUMPTION_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-[11px] text-zinc-500">
              kWh/100&nbsp;km
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-zinc-500">
              Ankunft mit
            </span>
            <select
              value={arrivalSoc}
              onChange={(e) => onArrivalSocChange(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-base text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              aria-label="Gewünschter Ladestand bei Ankunft in Prozent"
            >
              {ARRIVAL_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-[11px] text-zinc-500">am Ziel</span>
          </label>
        </div>

        {/* Lade-Position + Autobahn-Filter (eine Zeile) */}
        <div>
          <span className="mb-1 block text-xs uppercase text-zinc-500">
            Laden bevorzugt
          </span>
          <div className="flex items-stretch gap-2">
            <div className="grid flex-1 grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {(["start", "middle", "end"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={chargePref === p}
                  onClick={() => onChargePrefChange(p)}
                  className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    chargePref === p
                      ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-900 dark:text-emerald-300"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  }`}
                >
                  {CHARGE_PREF_LABELS[p]}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={highwayOnly}
              onClick={() => onHighwayOnlyChange(!highwayOnly)}
              title="Nur Schnelllader über 100 kW praktisch ohne Umweg (an der Autobahn)"
              aria-label="Nur Schnelllader über 100 kW an der Autobahn"
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 transition-colors ${
                highwayOnly
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <span aria-hidden="true" className="text-base">
                🛣️
              </span>
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  highwayOnly ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    highwayOnly ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {highwayOnly ? "Nur an der Autobahn · zeigt" : "Zeigt"} Säulen ≈{" "}
            <span className="tabular-nums">
              {Math.round(winLo)}–{Math.round(winHi)} km
            </span>{" "}
            ab Start (Reichweiten-Abschnitt).
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPlan || !destination || loading}
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
              ✓ Ziel ohne Nachladen erreichbar — mit ca. {arrivalSoc}% Restladung am
              Ziel.
            </div>
          ) : (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Nachladen nötig — Schnelllader im Abschnitt{" "}
              <span className="font-medium">
                {CHARGE_PREF_LABELS[chargePref]}
              </span>
              :
            </div>
          )}

          {stops.length > 0 && (
            <ul className="space-y-1.5">
              {stops.map((s) => {
                const selected = selectedStopIds.includes(s.properties.evseId);
                const suggested = s.properties.evseId === suggestedStopId;
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
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {s.properties.name ?? "Ladestation"}
                            </span>
                            {suggested && (
                              <span className="shrink-0 rounded bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                                Empfohlen
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          Ab Start: {Math.round(s.alongKm)} km · Nach Laden noch{" "}
                          {Math.max(0, Math.round(route.distanceKm - s.alongKm))} km
                          zum Ziel
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                          {s.properties.maxPowerKw != null && (
                            <span className="font-semibold tabular-nums">
                              {s.properties.maxPowerKw} kW
                            </span>
                          )}
                          <span className="text-zinc-400">·</span>
                          <span>≈ {chargeMin} min</span>
                          <span className="text-zinc-400">·</span>
                          <span className="tabular-nums">
                            {formatDetour(s.detourKm)} ab Route
                          </span>
                          {s.side === "left" && (
                            <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              ↔ Gegenfahrbahn
                            </span>
                          )}
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
              {highwayOnly
                ? `Keine Schnelllader (> 100 kW) im Abschnitt „${CHARGE_PREF_LABELS[chargePref]}" gefunden — Autobahn-Filter ausschalten oder andere Lade-Position wählen.`
                : `Keine Ladesäule im Abschnitt „${CHARGE_PREF_LABELS[chargePref]}" gefunden — andere Lade-Position wählen.`}
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
            Wetter und Höhe verschieden. Distanzen entlang der Route = Fahrstrecke,
            der seitliche Umweg ab Route = Luftlinie. Google Maps übernimmt auf dem
            Handy max. 3 Zwischenstopps; Apple Karten nur den nächsten Stopp.
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
