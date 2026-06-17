import { describe, expect, it } from "vitest";
import {
  derivePlug,
  mapNinjaResults,
  mapNinjaToVehicle,
  parseLeadingNumber,
  type RawNinjaVehicle,
} from "./ev-ninjas";

function raw(overrides: Partial<RawNinjaVehicle> = {}): RawNinjaVehicle {
  return {
    make: "Tesla",
    model: "Model 3",
    year_start: 2023,
    battery_useable_capacity: "57.5 kWh",
    battery_capacity: "60.0 kWh",
    vehicle_consumption: "112 Wh/km",
    charge_power_max: "170 kW DC",
    charge_power_10p_80p: "108 kW DC",
    charge_port: "CCS",
    ...overrides,
  };
}

describe("parseLeadingNumber", () => {
  it("liest die führende Dezimalzahl aus Wert+Einheit", () => {
    expect(parseLeadingNumber("57.5 kWh")).toBe(57.5);
    expect(parseLeadingNumber("170 kW DC")).toBe(170);
    expect(parseLeadingNumber("112 Wh/km")).toBe(112);
  });

  it("null bei fehlendem/leerem Wert", () => {
    expect(parseLeadingNumber(null)).toBeNull();
    expect(parseLeadingNumber(undefined)).toBeNull();
    expect(parseLeadingNumber("k. A.")).toBeNull();
  });
});

describe("derivePlug", () => {
  it("CCS/Combo/Tesla → ccs, CHAdeMO → chademo, sonst type2", () => {
    expect(derivePlug("CCS")).toBe("ccs");
    expect(derivePlug("CCS Combo 2")).toBe("ccs");
    expect(derivePlug("Tesla")).toBe("ccs");
    expect(derivePlug("CHAdeMO")).toBe("chademo");
    expect(derivePlug("Type 2")).toBe("type2");
    expect(derivePlug(null)).toBe("type2");
  });
});

describe("mapNinjaToVehicle", () => {
  it("mappt Felder und rechnet Wh/km → kWh/100 km um", () => {
    const v = mapNinjaToVehicle(raw());
    expect(v).not.toBeNull();
    expect(v).toMatchObject({
      name: "Tesla Model 3 (2023)",
      brand: "Tesla",
      model: "Model 3",
      usableKwh: 57.5,
      consumptionKwh100: 11.2, // 112 Wh/km
      dcPeakKw: 170,
      plug: "ccs",
    });
    expect(v!.id).toBe("tesla-model-3-2023");
  });

  it("synthetisiert eine flache Kurve aus charge_power_10p_80p", () => {
    const v = mapNinjaToVehicle(raw())!;
    expect(v.chargingCurve).toEqual([
      { percentage: 10, power: 108 },
      { percentage: 80, power: 108 },
    ]);
  });

  it("fällt auf battery_capacity bzw. dcPeak zurück", () => {
    const v = mapNinjaToVehicle(
      raw({ battery_useable_capacity: null, charge_power_10p_80p: null }),
    )!;
    expect(v.usableKwh).toBe(60); // battery_capacity
    expect(v.chargingCurve[0].power).toBe(170); // dcPeak als Kurven-Fallback
  });

  it("verwirft Treffer ohne Batterie", () => {
    expect(
      mapNinjaToVehicle(
        raw({ battery_useable_capacity: null, battery_capacity: null }),
      ),
    ).toBeNull();
  });

  it("nutzt Default-Verbrauch, wenn die API ihn sperrt (Gratis-Tarif)", () => {
    const v = mapNinjaToVehicle(
      raw({ vehicle_consumption: "This field is for premium subscribers only." }),
    )!;
    expect(v).not.toBeNull();
    expect(v.consumptionKwh100).toBe(18); // DEFAULT_CONSUMPTION_KWH100
  });

  it("Name ohne Jahr, wenn year_start fehlt", () => {
    const v = mapNinjaToVehicle(raw({ year_start: null }))!;
    expect(v.name).toBe("Tesla Model 3");
    expect(v.id).toBe("tesla-model-3");
  });
});

describe("mapNinjaResults", () => {
  it("filtert unbrauchbare Treffer heraus", () => {
    const out = mapNinjaResults([
      raw(),
      raw({ make: "Bad", battery_useable_capacity: null, battery_capacity: null }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].brand).toBe("Tesla");
  });
});
