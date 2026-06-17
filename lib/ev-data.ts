import type { ChargeCurvePoint, Vehicle, VehiclePlug } from "@/lib/vehicle";

/**
 * Transform für den open-ev-data-Datensatz (https://github.com/OpenChargingCloud/
 * open-ev-data, MIT). Reduziert die Rohdaten auf reine BEV mit DC-Lader und
 * mappt sie auf unsere {@link Vehicle}-Form. Bewusst ausgelagert (statt im
 * Sync-Skript), damit das Mapping unit-testbar bleibt.
 */

/** Roh-Eintrag aus data/ev-data.json (nur die genutzten Felder). */
export type RawEvVehicle = {
  id: string;
  brand: string;
  type: "bev" | "phev";
  model: string;
  release_year: number | null;
  variant: string;
  usable_battery_size: number;
  dc_charger: {
    ports: string[];
    max_power: number;
    charging_curve: ChargeCurvePoint[];
  } | null;
  energy_consumption: { average_consumption: number };
};

export type RawEvData = { data: RawEvVehicle[] };

/** DC-Ports → unser Stecker-Vorfilter. Alle Tesla-Ports zählen als CCS (CH-Netz). */
export function derivePlug(ports: string[]): VehiclePlug {
  const p = ports.map((x) => x.toLowerCase());
  if (p.some((x) => x.includes("ccs") || x.startsWith("tesla"))) return "ccs";
  if (p.some((x) => x.includes("chademo"))) return "chademo";
  return "type2";
}

/** Anzeigename: "Marke Modell Variante (Baujahr)" ohne leere Teile. */
export function buildVehicleName(raw: RawEvVehicle): string {
  const parts = [raw.brand, raw.model];
  if (raw.variant && raw.variant.trim()) parts.push(raw.variant.trim());
  const base = parts.join(" ");
  return raw.release_year ? `${base} (${raw.release_year})` : base;
}

/** Reine BEV mit DC-Lader auf unsere Vehicle-Form mappen, nach Name sortiert. */
export function mapRawToVehicles(raw: RawEvData): Vehicle[] {
  return raw.data
    .filter((v) => v.type === "bev" && v.dc_charger != null)
    .map((v): Vehicle => {
      const dc = v.dc_charger!;
      return {
        id: v.id,
        name: buildVehicleName(v),
        brand: v.brand,
        model: v.model,
        usableKwh: v.usable_battery_size,
        consumptionKwh100: v.energy_consumption.average_consumption,
        dcPeakKw: dc.max_power,
        chargingCurve: dc.charging_curve,
        plug: derivePlug(dc.ports),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
