/**
 * Referenzfahrzeug für den Reiseplaner (Phase 1): Tesla Model Y (Long Range).
 *
 * Bewusst EIN konkretes Fahrzeug statt eines abstrakten km-Sliders — das Model Y
 * ist das meistverkaufte E-Auto in CH/EU und liefert reale Werte (Batterie,
 * Verbrauch, Ladekurve, Stecker), ohne dass ein Fahrzeug-Picker nötig ist. Diese
 * Konstante ist zugleich der Default-Seed für den Phase-2-Picker.
 *
 * Werte gerundet aus Open EV Data / EV Database (Model Y Juniper 2025).
 * `consumptionKwh100` ist bewusst konservativ (realnah statt WLTP ~14–17), weil
 * Phase 1 keine Höhen-/Temperatur-Korrektur macht — lieber pessimistisch + Puffer.
 */
export type Vehicle = {
  name: string;
  /** Nutzbare Batteriekapazität in kWh. */
  usableKwh: number;
  /** Realnaher Verbrauch in kWh/100 km (vom Nutzer überschreibbar). */
  consumptionKwh100: number;
  /** Maximale DC-Ladeleistung in kW. */
  dcPeakKw: number;
  /** Grobe Ladezeit 10→80 % am ausreichend schnellen DC-Lader (Minuten). */
  charge1080Min: number;
  /** Steckertyp für den Korridor-Vorfilter. */
  plug: "ccs";
};

export const MODEL_Y: Vehicle = {
  name: "Tesla Model Y (Long Range)",
  usableKwh: 75,
  consumptionKwh100: 18,
  dcPeakKw: 250,
  charge1080Min: 30,
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

/**
 * Grobe Ladezeit 10→80 % [min] an einer Säule mit `stationPowerKw`.
 *
 * Heuristik: Die bekannte Angabe `charge1080Min` gilt, sobald der Lader mindestens
 * die über das 10→80-Fenster gemittelte Leistung liefert (Model Y ≈ 105 kW, da die
 * Ladekurve stark abfällt). Langsamere Lader sind der Begrenzer → Zeit skaliert
 * umgekehrt mit ihrer Leistung. Phase 2 ersetzt das durch eine echte Ladekurve.
 */
export function estimateChargeMinutes(
  stationPowerKw: number | null,
  v: Vehicle = MODEL_Y,
): number {
  const energy = 0.7 * v.usableKwh; // 10→80 %
  const sustainedKw = energy / (v.charge1080Min / 60);
  const power =
    stationPowerKw && stationPowerKw > 0 ? stationPowerKw : v.dcPeakKw;
  if (power >= sustainedKw) return v.charge1080Min;
  return (energy / power) * 60;
}
