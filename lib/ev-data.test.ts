import { describe, expect, it } from "vitest";
import {
  buildVehicleName,
  derivePlug,
  mapRawToVehicles,
  type RawEvData,
  type RawEvVehicle,
} from "./ev-data";

function rawBev(overrides: Partial<RawEvVehicle> = {}): RawEvVehicle {
  return {
    id: "id-1",
    brand: "Audi",
    type: "bev",
    model: "e-tron 55",
    release_year: 2019,
    variant: "",
    usable_battery_size: 86.5,
    dc_charger: {
      ports: ["ccs"],
      max_power: 155,
      charging_curve: [
        { percentage: 0, power: 137 },
        { percentage: 100, power: 50 },
      ],
    },
    energy_consumption: { average_consumption: 23.4 },
    ...overrides,
  };
}

describe("derivePlug", () => {
  it("CCS und alle Tesla-Ports zählen als ccs", () => {
    expect(derivePlug(["ccs"])).toBe("ccs");
    expect(derivePlug(["tesla_suc"])).toBe("ccs");
    expect(derivePlug(["ccs", "tesla_ccs"])).toBe("ccs");
    expect(derivePlug(["CCS", "chademo"])).toBe("ccs");
  });

  it("nur CHAdeMO → chademo", () => {
    expect(derivePlug(["chademo"])).toBe("chademo");
  });
});

describe("buildVehicleName", () => {
  it("setzt Marke, Modell, Variante und Baujahr zusammen", () => {
    expect(buildVehicleName(rawBev({ variant: "Long Range" }))).toBe(
      "Audi e-tron 55 Long Range (2019)",
    );
  });

  it("lässt leere Variante und fehlendes Baujahr weg", () => {
    expect(
      buildVehicleName(rawBev({ variant: "", release_year: null })),
    ).toBe("Audi e-tron 55");
  });
});

describe("mapRawToVehicles", () => {
  it("filtert PHEV und BEV ohne DC-Lader heraus", () => {
    const raw: RawEvData = {
      data: [
        rawBev({ id: "bev-ok" }),
        rawBev({ id: "phev", type: "phev" }),
        rawBev({ id: "no-dc", dc_charger: null }),
      ],
    };
    const out = mapRawToVehicles(raw);
    expect(out.map((v) => v.id)).toEqual(["bev-ok"]);
  });

  it("mappt auf die Vehicle-Form und sortiert nach Name", () => {
    const raw: RawEvData = {
      data: [
        rawBev({ id: "z", brand: "Zeekr", model: "X" }),
        rawBev({ id: "a", brand: "Audi", model: "Q4" }),
      ],
    };
    const out = mapRawToVehicles(raw);
    expect(out.map((v) => v.brand)).toEqual(["Audi", "Zeekr"]);
    expect(out[0]).toMatchObject({
      id: "a",
      usableKwh: 86.5,
      consumptionKwh100: 23.4,
      dcPeakKw: 155,
      plug: "ccs",
    });
    expect(out[0].chargingCurve.length).toBeGreaterThan(0);
  });
});
