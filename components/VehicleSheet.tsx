"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Button } from "@/components/ui/Button";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { IconCar } from "@/components/ui/Icon";
import type { Vehicle } from "@/lib/vehicle";
import type { VehicleKey } from "@/lib/selected-vehicle";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Aktuell gewähltes Fahrzeug (Default Model Y, sonst live aus API Ninjas). */
  selectedVehicle: Vehicle;
  /** true, während die Spezifikationen des gewählten Autos geladen werden. */
  vehicleLoading: boolean;
  /** Fahrzeug übernehmen (Kennung wird in localStorage gemerkt, Specs neu geholt). */
  onVehicleSelect: (key: VehicleKey) => void;
};

/**
 * Fahrzeugauswahl als eigenes Sheet — hält den Reiseplaner-Fluss kurz. Live-Suche
 * gegen /api/ev-spec (API Ninjas): nur auf Klick/Enter abfragen, Quota schonen.
 * Der Gratis-Tarif liefert nur einen Treffer pro Abfrage.
 */
export function VehicleSheet({
  open,
  onClose,
  selectedVehicle,
  vehicleLoading,
  onVehicleSelect,
}: Props) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const m = make.trim();
    const mod = model.trim();
    if (!m && !mod) return;
    setSearching(true);
    setError(null);
    setResult(null);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (m) params.set("make", m);
      if (mod) params.set("model", mod);
      const res = await fetch(`/api/ev-spec?${params}`);
      if (!res.ok) {
        throw new Error(
          res.status === 503
            ? "Fahrzeugsuche ist nicht konfiguriert."
            : "Suche fehlgeschlagen — bitte später erneut versuchen.",
        );
      }
      const list = (await res.json()) as Vehicle[];
      if (list.length === 0) {
        setError("Kein Fahrzeug gefunden — Marke/Modell genauer angeben.");
      } else {
        setResult(list[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suche fehlgeschlagen.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Auto auswählen">
      <SheetHeader
        icon={<IconCar />}
        title="Auto auswählen"
        subtitle="Marke und Modell suchen — für Reichweite und Ladezeit"
        onClose={onClose}
      />

      {/* Aktuelles Fahrzeug */}
      <div className="rounded-card border border-border bg-surface px-2.5 py-2">
        <span className="block truncate text-sm font-medium text-primary">
          {selectedVehicle.name}
          {vehicleLoading && <span className="ml-1 text-tertiary">· lädt …</span>}
        </span>
        <span className="mt-0.5 block t-caption tabular-nums text-tertiary">
          {selectedVehicle.usableKwh} kWh · DC bis {selectedVehicle.dcPeakKw} kW
        </span>
      </div>

      {/* Suche */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Marke (z. B. Tesla)"
          aria-label="Marke"
          className="w-full rounded-control border border-border-strong bg-field px-2 py-1.5 text-base text-primary outline-none"
        />
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Modell (z. B. Model 3)"
          aria-label="Modell"
          className="w-full rounded-control border border-border-strong bg-field px-2 py-1.5 text-base text-primary outline-none"
        />
      </div>
      <Button
        variant="secondary"
        className="mt-2 w-full"
        loading={searching}
        disabled={!make.trim() && !model.trim()}
        onClick={handleSearch}
      >
        Fahrzeug suchen
      </Button>

      {error && (
        <InfoCallout tone="warn" className="mt-2">
          {error}
        </InfoCallout>
      )}

      {result && (
        <div className="mt-2 flex items-center gap-2 rounded-card border border-brand bg-brand-soft px-2.5 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-primary">
              {result.name}
            </span>
            <span className="block t-caption tabular-nums text-tertiary">
              {result.usableKwh} kWh · DC bis {result.dcPeakKw} kW ·{" "}
              {result.consumptionKwh100} kWh/100&nbsp;km
            </span>
          </span>
          <Button
            variant="primary"
            onClick={() => {
              onVehicleSelect({ make: result.brand, model: result.model });
              onClose();
            }}
          >
            Übernehmen
          </Button>
        </div>
      )}

      {!result && !error && !searched && (
        <p className="mt-2 t-caption text-tertiary">
          Tipp: Marke und Modell möglichst genau angeben — es wird der beste
          einzelne Treffer angezeigt.
        </p>
      )}
    </Sheet>
  );
}
