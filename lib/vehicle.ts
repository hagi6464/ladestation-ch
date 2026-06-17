import type { PlugFilter } from "@/lib/plugs";

/** Steckertyp eines Fahrzeugs für den Korridor-Vorfilter (ohne "any"). */
export type VehiclePlug = Exclude<PlugFilter, "any">;

/** Ein Punkt der DC-Ladekurve: bei `percentage` % SoC liefert das Auto `power` kW. */
export type ChargeCurvePoint = { percentage: number; power: number };

/**
 * Fahrzeug-Datensatz für den Reiseplaner. Die meisten Einträge stammen aus
 * open-ev-data (kuratiert in data/ev-data.json), `MODEL_Y` ist der hand­gepflegte
 * Default (im Datensatz nicht enthalten).
 */
export type Vehicle = {
  /** Stabile ID (open-ev-data UUID bzw. "default-..." für den Fallback). */
  id: string;
  /** Anzeigename inkl. Variante/Baujahr. */
  name: string;
  /** Marke, für die Gruppierung im Picker. */
  brand: string;
  /** Modellname ohne Marke. */
  model: string;
  /** Nutzbare Batteriekapazität in kWh. */
  usableKwh: number;
  /** Realnaher Verbrauch in kWh/100 km (vom Nutzer überschreibbar). */
  consumptionKwh100: number;
  /** Maximale DC-Ladeleistung in kW. */
  dcPeakKw: number;
  /** DC-Ladekurve (aufsteigend nach `percentage`); Basis der Ladezeit-Schätzung. */
  chargingCurve: ChargeCurvePoint[];
  /** Steckertyp für den Korridor-Vorfilter. */
  plug: VehiclePlug;
};

/**
 * Default-Referenzfahrzeug: Tesla Model Y (Long Range). Das meistverkaufte E-Auto
 * in CH/EU und im open-ev-data-Datensatz nicht enthalten, daher hier fix gepflegt.
 * `consumptionKwh100` ist bewusst konservativ (realnah statt WLTP ~14–17), weil der
 * Planer keine Höhen-/Temperatur-Korrektur macht — lieber pessimistisch + Puffer.
 * Die Ladekurve ist eine grobe Näherung der bekannten 250-kW-Kurve.
 */
export const MODEL_Y: Vehicle = {
  id: "default-model-y",
  name: "Tesla Model Y (Long Range)",
  brand: "Tesla",
  model: "Model Y",
  usableKwh: 75,
  consumptionKwh100: 18,
  dcPeakKw: 250,
  chargingCurve: [
    { percentage: 0, power: 170 },
    { percentage: 10, power: 250 },
    { percentage: 20, power: 250 },
    { percentage: 30, power: 175 },
    { percentage: 40, power: 150 },
    { percentage: 50, power: 120 },
    { percentage: 60, power: 100 },
    { percentage: 70, power: 85 },
    { percentage: 80, power: 70 },
    { percentage: 100, power: 35 },
  ],
  plug: "ccs",
};

/** Bevorzugte Lade-Position entlang der Reichweite aus dem aktuellen Ladestand. */
export type ChargePref = "start" | "middle" | "end";

/**
 * Entfernungsfenster ab Start [km] für die gewählte Lade-Position — **lückenlose**
 * Drittel der übergebenen Länge `lengthKm`, damit keine Säule zwischen den Zonen
 * verloren geht. Aufrufer übergibt min(Reichweite, Fahrstrecke), damit Mitte/Ende
 * bei kurzen Reisen nicht hinter dem Ziel liegen:
 * - start  = erstes Drittel (0 – ⅓)
 * - middle = mittleres Drittel (⅓ – ⅔)
 * - end    = letztes Drittel (⅔ – volle Länge)
 */
export function chargeWindowKm(
  pref: ChargePref,
  lengthKm: number,
): [number, number] {
  const third = lengthKm / 3;
  if (pref === "start") return [0, third];
  if (pref === "end") return [2 * third, lengthKm];
  return [third, 2 * third];
}

/** Reichweite [km] aus Ladezustand (%), Verbrauch und nutzbarer Batterie. */
export function estimateRangeKm(
  socPercent: number,
  consumptionKwh100: number,
  usableKwh: number,
): number {
  if (consumptionKwh100 <= 0) return 0;
  const soc = Math.max(0, Math.min(100, socPercent));
  const energy = usableKwh * (soc / 100);
  return (energy / consumptionKwh100) * 100;
}

/** SoC-Fenster der Ladezeit-Schätzung: typischer Schnelllade-Hub 10 → 80 %. */
export const CHARGE_FROM_PCT = 10;
export const CHARGE_TO_PCT = 80;

/** Lineare Interpolation der Ladekurve: erwartete DC-Leistung [kW] beim Ladestand `soc`. */
function powerAtSoc(curve: ChargeCurvePoint[], soc: number): number {
  if (curve.length === 0) return 0;
  if (soc <= curve[0].percentage) return curve[0].power;
  const last = curve[curve.length - 1];
  if (soc >= last.percentage) return last.power;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (soc <= b.percentage) {
      const span = b.percentage - a.percentage;
      const t = span > 0 ? (soc - a.percentage) / span : 0;
      return a.power + (b.power - a.power) * t;
    }
  }
  return last.power;
}

/**
 * Ladezeit [min] von `fromPct` → `toPct` an einer Säule mit `stationPowerKw`.
 *
 * Integriert die Ladekurve des Fahrzeugs in 1-%-Scheiben: je Scheibe ist die
 * effektive Leistung min(Kurvenleistung, Säulenleistung), Zeit = Energie/Leistung.
 * So begrenzt mal das Auto (oben in der Kurve), mal die Säule (langsamer Lader).
 * Unbekannte Säulenleistung (null/0) → nur die Fahrzeugkurve begrenzt.
 */
export function estimateChargeMinutes(
  stationPowerKw: number | null,
  vehicle: Vehicle = MODEL_Y,
  fromPct: number = CHARGE_FROM_PCT,
  toPct: number = CHARGE_TO_PCT,
): number {
  if (toPct <= fromPct || vehicle.usableKwh <= 0) return 0;
  const cap = stationPowerKw && stationPowerKw > 0 ? stationPowerKw : Infinity;
  const steps = Math.max(1, Math.round(toPct - fromPct));
  const stepPct = (toPct - fromPct) / steps;
  const energyPerStep = vehicle.usableKwh * (stepPct / 100);
  let minutes = 0;
  for (let i = 0; i < steps; i++) {
    const soc = fromPct + stepPct * (i + 0.5); // Scheiben-Mittelpunkt
    const power = Math.min(powerAtSoc(vehicle.chargingCurve, soc), cap);
    if (power <= 0) continue;
    minutes += (energyPerStep / power) * 60;
  }
  return minutes;
}
