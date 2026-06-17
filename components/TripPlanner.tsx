"use client";

import { useState } from "react";
import type { CorridorStation, TripRoute } from "@/lib/types";
import type { VehicleKey } from "@/lib/selected-vehicle";
import { findCpoTariff, type CpoTariff } from "@/lib/cpo-tariffs";
import {
  estimateChargeMinutes,
  chargeWindowKm,
  type ChargePref,
  type Vehicle,
} from "@/lib/vehicle";
import { GeocodeField, type GeocodeResult } from "@/components/GeocodeField";
import { VehicleSheet } from "@/components/VehicleSheet";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  IconCar,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconLocate,
  IconNavigation,
  IconRoute,
  IconRotate,
} from "@/components/ui/Icon";

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
  /** GPS-Standort (erneut) anfordern — „Mein Standort"-Knopf im Startfeld. */
  onLocateStart: () => void;
  locating: boolean;
  locateError: string | null;
  /** Per GPS erkannte Ortschaft — wird ins Startfeld geschrieben (nur Anzeige). */
  locatedLabel: string | null;
  /** Aktuell gewähltes Fahrzeug (Default Model Y, sonst live aus API Ninjas). */
  selectedVehicle: Vehicle;
  /** true, während die Spezifikationen des gewählten Autos geladen werden. */
  vehicleLoading: boolean;
  /** Fahrzeug übernehmen (Kennung wird in localStorage gemerkt, Specs neu geholt). */
  onVehicleSelect: (key: VehicleKey) => void;
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

const CHARGE_PREF_OPTIONS: { value: ChargePref; label: string }[] = [
  { value: "start", label: "Anfang" },
  { value: "middle", label: "Mitte" },
  { value: "end", label: "Ende" },
];

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
  onLocateStart,
  locating,
  locateError,
  locatedLabel,
  selectedVehicle,
  vehicleLoading,
  onVehicleSelect,
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
  // Zuletzt per GPS gesetzter Feldtext — unterscheidet „zeigt Mein Standort"
  // von einer manuellen Eingabe (die nie überschrieben wird).
  const [gpsLabel, setGpsLabel] = useState<string | null>(null);

  // Fahrzeugauswahl ausgelagert ins VehicleSheet (Icon-Knopf im Kopf).
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);

  // Neue GPS-Ortschaft ins Startfeld übernehmen (guarded Render-Anpassung).
  const [prevLocatedLabel, setPrevLocatedLabel] = useState<string | null>(null);
  if (locatedLabel !== prevLocatedLabel) {
    setPrevLocatedLabel(locatedLabel);
    if (locatedLabel) {
      if (startQuery === "" || startQuery === gpsLabel) {
        setStartQuery(locatedLabel);
      }
      setGpsLabel(locatedLabel);
    }
  }

  if (!open) return null;

  // GPS ist die Start-Quelle: Feld leer (Platzhalter) oder zeigt die GPS-Ortschaft.
  const gpsIsStart = canPlan && (startQuery === "" || startQuery === gpsLabel);

  const reachWithoutCharge =
    route != null && route.distanceKm <= rangeKm - reserveKm;

  // Entfernungsfenster ab Start für die gewählte Lade-Position — relativ zur
  // tatsächlichen Fahrstrecke, gedeckelt auf die Reichweite (vor dem Planen: Reichweite).
  const planLengthKm = route ? Math.min(rangeKm, route.distanceKm) : rangeKm;
  const [winLo, winHi] = chargeWindowKm(chargePref, planLengthKm);

  return (
    <aside
      className="pointer-events-auto fixed inset-0 z-30 overflow-y-auto bg-surface p-5 shadow-sheet landscape:inset-y-0 landscape:right-auto landscape:w-2/5 landscape:min-w-[300px] landscape:max-w-[460px] landscape:rounded-r-sheet landscape:border-r landscape:border-border"
      aria-label="Reiseplaner"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="t-title text-primary">Reise planen</h2>
        <div className="-mr-1 -mt-1 flex items-center">
          <IconButton
            label="Fahrzeug wählen"
            onClick={() => setVehicleSheetOpen(true)}
          >
            <IconCar size={20} />
          </IconButton>
          <IconButton label="Schliessen" onClick={onClose}>
            <IconClose size={20} />
          </IconButton>
        </div>
      </div>

      {/* Nur auf dem Handy im Hochformat: Hinweis aufs Querformat. */}
      <InfoCallout
        tone="info"
        icon={<IconRotate size={16} />}
        className="mb-3 items-center sm:hidden landscape:hidden"
      >
        Tipp: Gerät um 90° drehen (Querformat), damit Karte und Planer
        nebeneinander sichtbar sind.
      </InfoCallout>

      {!canPlan && (
        <InfoCallout tone="warn" className="mb-3">
          {locating
            ? "Standort wird abgefragt …"
            : "Kein Standort — den Standort-Knopf im Startfeld antippen oder einen Start eingeben."}
        </InfoCallout>
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
          committedValue={locatedLabel}
          trailing={
            <>
              {startQuery && (
                <IconButton
                  label="Eingabe löschen (mein Standort verwenden)"
                  onClick={() => {
                    setStartQuery("");
                    onStartClear();
                  }}
                >
                  <IconClose size={16} />
                </IconButton>
              )}
              <IconButton
                label="Mein Standort"
                disabled={locating}
                onClick={() => {
                  setStartQuery("");
                  onLocateStart();
                }}
              >
                {locating ? (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent"
                    aria-hidden="true"
                  />
                ) : (
                  <IconLocate
                    size={18}
                    // blau = GPS ist aktiv die Start-Quelle
                    className={gpsIsStart ? "text-accent" : undefined}
                  />
                )}
              </IconButton>
            </>
          }
        />

        {locateError && <InfoCallout tone="danger">{locateError}</InfoCallout>}

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

        {/* Ladezustand (breiter Balken) + Ankunft mit auf einer Zeile */}
        <div className="grid grid-cols-4 items-start gap-3">
          <div className="col-span-3">
            <div className="mb-1 flex items-baseline justify-between gap-1">
              <SectionLabel as="label" className="mb-0">
                Ladezustand
              </SectionLabel>
              <span className="text-sm font-semibold tabular-nums text-primary">
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
              className="w-full accent-brand"
              aria-label="Ladezustand in Prozent"
            />
          </div>

          <label className="col-span-1 block">
            <SectionLabel>Ankunft mit</SectionLabel>
            <select
              value={arrivalSoc}
              onChange={(e) => onArrivalSocChange(Number(e.target.value))}
              className="w-full rounded-control border border-border-strong bg-field px-2 py-1.5 text-base text-primary outline-none"
              aria-label="Gewünschter Ladestand bei Ankunft in Prozent"
            >
              {ARRIVAL_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Reichweite + Verbrauch (Verbrauch-Zahl = verstecktes Dropdown) */}
        <div className="t-caption leading-relaxed text-tertiary">
          <div>
            Reichweite ≈{" "}
            <span className="font-semibold tabular-nums text-secondary">
              {Math.round(rangeKm)} km
            </span>{" "}
            (Reserve ≈ {Math.round(reserveKm)} km für {arrivalSoc}% am Ziel)
          </div>
          <div className="mt-0.5">
            Verbrauch:{" "}
            <select
              value={consumption}
              onChange={(e) => onConsumptionChange(Number(e.target.value))}
              aria-label="Verbrauch in kWh pro 100 km anpassen"
              className="cursor-pointer appearance-none bg-transparent text-base font-semibold text-primary underline decoration-dotted underline-offset-2 outline-none"
            >
              {CONSUMPTION_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <IconChevronDown
              size={12}
              className="pointer-events-none -ml-0.5 inline align-middle text-tertiary"
            />{" "}
            kWh/100&nbsp;km laut {selectedVehicle.name}
          </div>
        </div>

        {/* Lade-Position + Autobahn-Filter (eine Zeile) */}
        <div>
          <SectionLabel>Laden bevorzugt</SectionLabel>
          <div className="flex items-stretch gap-2">
            <SegmentedControl
              className="flex-1"
              ariaLabel="Laden bevorzugt"
              options={CHARGE_PREF_OPTIONS}
              value={chargePref}
              onChange={onChargePrefChange}
            />
            <button
              type="button"
              role="switch"
              aria-checked={highwayOnly}
              onClick={() => onHighwayOnlyChange(!highwayOnly)}
              title="Nur Schnelllader über 100 kW praktisch ohne Umweg (an der Autobahn)"
              aria-label="Nur Schnelllader über 100 kW an der Autobahn"
              className={`flex shrink-0 items-center gap-1.5 rounded-control border px-2.5 transition-colors ${
                highwayOnly
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-border-strong bg-field text-secondary hover:text-primary"
              }`}
            >
              <IconRoute size={16} />
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  highwayOnly ? "bg-brand" : "bg-border-strong"
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
          <div className="mt-1 t-caption text-tertiary">
            {highwayOnly ? "Nur an der Autobahn · zeigt" : "Zeigt"} Säulen ≈{" "}
            <span className="tabular-nums">
              {Math.round(winLo)}–{Math.round(winHi)} km
            </span>{" "}
            ab Start (Reise-Abschnitt).
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={!canPlan || !destination}
            loading={loading}
            onClick={() => destination && onPlan(destination)}
          >
            {!loading && <IconNavigation size={16} />}
            Route planen
          </Button>
          {route && (
            <Button variant="secondary" onClick={onClear}>
              Zurücksetzen
            </Button>
          )}
        </div>

        {error && <InfoCallout tone="danger">{error}</InfoCallout>}
      </div>

      {/* Ergebnis */}
      {route && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
            <span className="font-semibold tabular-nums text-primary">
              {Math.round(route.distanceKm)} km
            </span>
            <span className="text-tertiary">·</span>
            <span className="tabular-nums">
              ≈ {formatDuration(route.durationMin)}
            </span>
          </div>

          {reachWithoutCharge ? (
            <InfoCallout tone="success" icon={<IconCheck size={16} />}>
              Ziel ohne Nachladen erreichbar — mit ca. {arrivalSoc}% Restladung am
              Ziel.
            </InfoCallout>
          ) : (
            <div className="t-caption text-tertiary">
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
                const chargeMin =
                  Math.round(
                    estimateChargeMinutes(
                      s.properties.maxPowerKw,
                      selectedVehicle,
                    ) / 5,
                  ) * 5;
                return (
                  <li key={s.properties.evseId}>
                    <button
                      type="button"
                      onClick={() => onToggleStop(s.properties.evseId)}
                      className={`flex w-full items-start gap-2 rounded-card border px-2.5 py-2 text-left transition-colors ${
                        selected
                          ? "border-brand bg-brand-soft"
                          : "border-border bg-surface hover:border-border-strong"
                      } ${s.reachable ? "" : "opacity-60"}`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? "border-brand bg-brand text-on-brand"
                            : "border-border-strong"
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <IconCheck size={12} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-primary">
                              {s.properties.name ?? "Ladestation"}
                            </span>
                            {suggested && (
                              <Badge tone="brand" variant="solid">
                                Empfohlen
                              </Badge>
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block t-caption tabular-nums text-tertiary">
                          Ab Start {Math.round(s.alongKm)} km · ab Laden{" "}
                          {Math.max(
                            0,
                            Math.round(route.distanceKm - s.alongKm),
                          )}{" "}
                          km
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 t-caption text-secondary">
                          {s.properties.maxPowerKw != null && (
                            <span className="font-semibold tabular-nums">
                              {s.properties.maxPowerKw} kW
                            </span>
                          )}
                          <span className="text-tertiary">·</span>
                          <span>≈ {chargeMin} min</span>
                          <span className="text-tertiary">·</span>
                          <span className="tabular-nums">
                            {formatDetour(s.detourKm)} ab Route
                          </span>
                          {s.side === "left" && (
                            <Badge tone="warning">↔ Gegenfahrbahn</Badge>
                          )}
                          {dc != null && (
                            <>
                              <span className="text-tertiary">·</span>
                              <span className="tabular-nums">
                                ab {dc.toFixed(2)} CHF/kWh
                              </span>
                            </>
                          )}
                          {!s.reachable && (
                            <Badge tone="neutral">ausser Reichweite</Badge>
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
            <InfoCallout tone="warn">
              {highwayOnly
                ? `Keine Schnelllader (> 100 kW) im Abschnitt „${CHARGE_PREF_LABELS[chargePref]}" gefunden — Autobahn-Filter ausschalten oder andere Lade-Position wählen.`
                : `Keine Ladesäule im Abschnitt „${CHARGE_PREF_LABELS[chargePref]}" gefunden — andere Lade-Position wählen.`}
            </InfoCallout>
          )}

          <Button
            variant="accent"
            className="w-full"
            onClick={onOpenInMaps}
          >
            <IconNavigation size={16} />
            In Google Maps öffnen
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={onOpenInApple}
          >
            In Apple Karten (nächster Stopp)
          </Button>

          <p className="t-caption leading-relaxed text-tertiary">
            Grobe Orientierung ohne Gewähr — Verbrauch/Reichweite je nach Tempo,
            Wetter und Höhe verschieden. Distanzen entlang der Route =
            Fahrstrecke, der seitliche Umweg ab Route = Luftlinie. Google Maps
            übernimmt auf dem Handy max. 3 Zwischenstopps; Apple Karten nur den
            nächsten Stopp.
          </p>
        </div>
      )}

      <VehicleSheet
        open={vehicleSheetOpen}
        onClose={() => setVehicleSheetOpen(false)}
        selectedVehicle={selectedVehicle}
        vehicleLoading={vehicleLoading}
        onVehicleSelect={onVehicleSelect}
      />
    </aside>
  );
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h <= 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}
