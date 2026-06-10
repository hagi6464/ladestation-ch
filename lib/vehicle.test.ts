import { describe, expect, it } from "vitest";
import {
  MODEL_Y,
  chargeWindowKm,
  estimateChargeMinutes,
  estimateRangeKm,
} from "./vehicle";

describe("estimateRangeKm", () => {
  it("80 % / 18 kWh/100km / 75 kWh → ≈ 333 km (Wert aus der Planer-UI)", () => {
    expect(estimateRangeKm(80, 18, 75)).toBeCloseTo(333.33, 1);
  });

  it("100 % → volle Reichweite", () => {
    expect(estimateRangeKm(100, 18, 75)).toBeCloseTo(416.67, 1);
  });

  it("klemmt SoC auf 0–100 %", () => {
    expect(estimateRangeKm(150, 18, 75)).toBe(estimateRangeKm(100, 18, 75));
    expect(estimateRangeKm(-10, 18, 75)).toBe(0);
  });

  it("Verbrauch ≤ 0 → 0 (keine Division durch null)", () => {
    expect(estimateRangeKm(80, 0, 75)).toBe(0);
    expect(estimateRangeKm(80, -5, 75)).toBe(0);
  });
});

describe("chargeWindowKm", () => {
  it("teilt die Reichweite in lückenlose Drittel", () => {
    const range = 300;
    const [s0, s1] = chargeWindowKm("start", range);
    const [m0, m1] = chargeWindowKm("middle", range);
    const [e0, e1] = chargeWindowKm("end", range);
    expect(s0).toBe(0);
    expect(s1).toBe(m0); // keine Lücke start→middle
    expect(m1).toBe(e0); // keine Lücke middle→end
    expect(e1).toBe(range);
    expect(s1).toBeCloseTo(100, 10);
    expect(m1).toBeCloseTo(200, 10);
  });
});

describe("estimateChargeMinutes", () => {
  // Gemittelte 10→80-Leistung des Model Y: 0.7·75 kWh / 0.5 h = 105 kW.
  const sustainedKw = (0.7 * MODEL_Y.usableKwh) / (MODEL_Y.charge1080Min / 60);

  it("Lader ≥ gemittelte Leistung → bekannte 10→80-Zeit", () => {
    expect(estimateChargeMinutes(sustainedKw)).toBe(MODEL_Y.charge1080Min);
    expect(estimateChargeMinutes(300)).toBe(MODEL_Y.charge1080Min);
  });

  it("langsamer Lader skaliert umgekehrt zur Leistung (50 kW → 63 min)", () => {
    expect(estimateChargeMinutes(50)).toBeCloseTo(63, 5);
  });

  it("unbekannte Leistung (null/0) → Peak-Annahme = bekannte Zeit", () => {
    expect(estimateChargeMinutes(null)).toBe(MODEL_Y.charge1080Min);
    expect(estimateChargeMinutes(0)).toBe(MODEL_Y.charge1080Min);
  });

  it("monoton: weniger kW nie schneller", () => {
    expect(estimateChargeMinutes(50)).toBeGreaterThan(
      estimateChargeMinutes(100),
    );
    expect(estimateChargeMinutes(100)).toBeGreaterThanOrEqual(
      estimateChargeMinutes(150),
    );
  });
});
