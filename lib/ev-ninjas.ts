import type { Vehicle, VehiclePlug } from "@/lib/vehicle";

/**
 * Mapping für die API Ninjas Electric Vehicle API
 * (https://api-ninjas.com/api/electricvehicle). Bewusst ausgelagert (statt im
 * Proxy-Handler), damit Parsing/Mapping unit-testbar bleibt.
 *
 * Die API liefert die meisten Werte als String mit Einheit („57.5 kWh",
 * „112 Wh/km", „170 kW DC") und KEINE Ladekurve — nur einen Ø-Wert
 * `charge_power_10p_80p`. Daraus synthetisieren wir eine flache 2-Punkt-Kurve,
 * damit {@link estimateChargeMinutes} unverändert weiterläuft.
 *
 * Achtung Gratis-Tarif: einige Felder (u. a. `vehicle_consumption`,
 * `battery_capacity`) sind dort gesperrt („premium subscribers only"). Fehlt der
 * Verbrauch, nutzen wir einen konservativen Default — der Nutzer kann ihn im
 * Planer ohnehin anpassen. Die batterie- und ladeleistungsspezifischen Werte
 * (`battery_useable_capacity`, `charge_power_max`, `charge_power_10p_80p`) sind
 * auch im Gratis-Tarif vorhanden.
 */

/** Default-Verbrauch [kWh/100 km], wenn die API ihn nicht liefert (anpassbar im Planer). */
export const DEFAULT_CONSUMPTION_KWH100 = 18;

/** Roh-Eintrag der API (nur die genutzten Felder). */
export type RawNinjaVehicle = {
  make: string;
  model: string;
  year_start?: number | string | null;
  battery_useable_capacity?: string | null;
  battery_capacity?: string | null;
  vehicle_consumption?: string | null;
  charge_power_max?: string | null;
  charge_power_10p_80p?: string | null;
  charge_port?: string | null;
};

/** Führende Dezimalzahl aus einem Wert wie „57.5 kWh" / „170 kW DC". null wenn keine. */
export function parseLeadingNumber(value: string | null | undefined): number | null {
  if (value == null) return null;
  const m = String(value).match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Ladeanschluss → unser Stecker-Vorfilter. */
export function derivePlug(port: string | null | undefined): VehiclePlug {
  const p = (port ?? "").toLowerCase();
  if (p.includes("ccs") || p.includes("tesla") || p.includes("combo")) return "ccs";
  if (p.includes("chademo")) return "chademo";
  return "type2";
}

/** Slug für eine stabile ID aus Marke/Modell/Jahr. */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Mappt einen API-Ninjas-Eintrag auf unsere {@link Vehicle}-Form. Gibt `null`
 * zurück, wenn die für den Reiseplaner nötigen Kernwerte (Batterie, Verbrauch)
 * fehlen — solche Treffer sind unbrauchbar.
 */
export function mapNinjaToVehicle(raw: RawNinjaVehicle): Vehicle | null {
  const usableKwh =
    parseLeadingNumber(raw.battery_useable_capacity) ??
    parseLeadingNumber(raw.battery_capacity);
  // Batterie ist Pflicht (Reichweite); Verbrauch ist im Gratis-Tarif oft gesperrt
  // → Default, im Planer anpassbar.
  if (usableKwh == null || usableKwh <= 0) return null;
  const consumptionWhKm = parseLeadingNumber(raw.vehicle_consumption);

  const dcPeakKw = parseLeadingNumber(raw.charge_power_max) ?? 0;
  const p1080 = parseLeadingNumber(raw.charge_power_10p_80p) ?? dcPeakKw;
  const year = raw.year_start != null ? String(raw.year_start).trim() : "";

  return {
    id: slug([raw.make, raw.model, year].filter(Boolean).join(" ")),
    name: year ? `${raw.make} ${raw.model} (${year})` : `${raw.make} ${raw.model}`,
    brand: raw.make,
    model: raw.model,
    usableKwh,
    consumptionKwh100:
      consumptionWhKm != null
        ? consumptionWhKm / 10 // Wh/km → kWh/100 km
        : DEFAULT_CONSUMPTION_KWH100,
    dcPeakKw,
    // Keine echte Kurve verfügbar → flacher Ø-Wert 10→80 % (Fallback dcPeak).
    chargingCurve:
      p1080 > 0
        ? [
            { percentage: 10, power: p1080 },
            { percentage: 80, power: p1080 },
          ]
        : [],
    plug: derivePlug(raw.charge_port),
  };
}

/** Alle brauchbaren Treffer einer API-Antwort mappen. */
export function mapNinjaResults(raw: RawNinjaVehicle[]): Vehicle[] {
  return raw.map(mapNinjaToVehicle).filter((v): v is Vehicle => v != null);
}
