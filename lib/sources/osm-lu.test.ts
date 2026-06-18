import { describe, expect, it } from "vitest";
import {
  classifyPlugs,
  mapElement,
  mapElements,
  maxPowerKw,
  type OverpassElement,
} from "./osm-lu";

// Echte OSM-Tags aus Luxemburg (Overpass, Chargy/SuperChargy).
const superchargy: OverpassElement = {
  type: "node",
  id: 1581360473,
  lat: 49.51,
  lon: 6.05,
  tags: {
    amenity: "charging_station",
    brand: "Chargy",
    capacity: "6",
    name: "SuperChargy - Aire de Berchem-Ouest",
    opening_hours: "24/7",
    operator: "Chargy",
    "socket:type2": "6",
    "socket:type2:output": "160 kW;350 kW",
  },
};

const chargyAc: OverpassElement = {
  type: "node",
  id: 1272891735,
  lat: 49.62,
  lon: 6.07,
  tags: {
    amenity: "charging_station",
    brand: "Chargy",
    name: "Chargy Ok - Creos Strassen",
    opening_hours: "24/7",
    operator: "Enovos International LUX",
    "authentication:membership_card": "yes",
    "socket:type2": "2",
    "socket:type2:output": "22 kW",
    phone: "+352 80062020",
  },
};

describe("classifyPlugs", () => {
  it("Type 2 → AC", () => {
    expect(classifyPlugs(chargyAc.tags!)).toEqual({
      plugs: ["Type 2"],
      isAc: true,
      isDc: false,
    });
  });
  it("CCS/CHAdeMO → DC", () => {
    const r = classifyPlugs({ "socket:type2_combo": "2", "socket:chademo": "1" });
    expect(new Set(r.plugs)).toEqual(new Set(["CCS Combo 2", "CHAdeMO"]));
    expect(r).toMatchObject({ isAc: false, isDc: true });
  });
});

describe("maxPowerKw", () => {
  it("nimmt das Maximum aus mehrwertigen output-Tags", () => {
    expect(maxPowerKw(superchargy.tags!)).toBe(350);
  });
  it("parst '22 kW'", () => {
    expect(maxPowerKw(chargyAc.tags!)).toBe(22);
  });
  it("Watt → kW", () => {
    expect(maxPowerKw({ "socket:type2:output": "22000" })).toBe(22);
  });
  it("ohne Leistungs-Tag → null", () => {
    expect(maxPowerKw({ amenity: "charging_station" })).toBeNull();
  });
});

describe("mapElement", () => {
  it("mappt eine SuperChargy-Station (DC ab Leistungsheuristik)", () => {
    const s = mapElement(superchargy)!;
    expect(s).toMatchObject({
      evseId: "LU:osm:n1581360473",
      operatorName: "Chargy",
      lat: 49.51,
      lon: 6.05,
      country: "LU",
      nameEn: "SuperChargy - Aire de Berchem-Ouest",
      plugs: ["Type 2"],
      maxPowerKw: 350,
      isAc: true,
      isDc: true, // Type 2 + 350 kW ⇒ DC-Heuristik greift zusätzlich
      isOpen24h: true,
      dynamicInfoAvailable: false,
    });
    expect(s.raw).toEqual({ source: "osm-lu" });
  });

  it("mappt eine AC-Chargy-Station inkl. authModes/hotline", () => {
    const s = mapElement(chargyAc)!;
    expect(s.evseId).toBe("LU:osm:n1272891735");
    expect(s.maxPowerKw).toBe(22);
    expect(s.isDc).toBe(false);
    expect(s.authModes).toEqual(["membership_card"]);
    expect(s.hotline).toBe("+352 80062020");
  });

  it("verwirft reine Velo-Ladepunkte und Elemente ohne Koordinaten", () => {
    expect(
      mapElement({ ...chargyAc, tags: { ...chargyAc.tags!, motorcar: "no" } }),
    ).toBeNull();
    expect(mapElement({ type: "node", id: 1, tags: {} })).toBeNull();
  });

  it("dedupliziert in mapElements nach evseId", () => {
    expect(mapElements([chargyAc, chargyAc, superchargy])).toHaveLength(2);
  });
});
