import { describe, expect, it } from "vitest";
import {
  classifyElectricity,
  isOpen24h,
  mapConnector,
  mapPointToStation,
  mapPointToStatus,
  mapStatus,
  type EcOperator,
  type EcPoint,
  type EcStation,
} from "./econtrol-at";

// Echte Beispieldaten aus der E-Control-Public-API (Operator 991, Porsche).
const operator: EcOperator = {
  operatorId: "991",
  organization: "Porsche Sales & Marketplace GmbH",
};
const station: EcStation = {
  stationId: "E10187829",
  stationStatus: "ACTIVE",
  label: "Porsche Destination Charging Schwarz Wein GmbH & Co KG",
  country: "AT",
  postCode: "7163",
  city: "Andau",
  street: "baumhöhäcker 16",
  latitude: 47.7773,
  longitude: 17.0386,
  phoneCountryCode: "DE",
  regionCode: "0711",
  phoneNumber: "91177500",
  greenEnergy: false,
  maxCapacityKw: 22,
  openingHours: [
    { fromWeekday: "MONDAY", fromTime: "00:00", toWeekday: "SUNDAY", toTime: "24:00" },
  ],
};
const point: EcPoint = {
  evseId: "AT*991*E*PDC*AT1000406*0000001",
  capacityKw: 22.17,
  latitude: 47.7773,
  longitude: 17.0386,
  authenticationMode: ["APP", "CREDIT_CARD"],
  connectorType: ["CTYPE2"],
  electricityType: ["AC_3_PHASE"],
  status: "AVAILABLE",
};

describe("mapConnector", () => {
  it("mappt beide E-Control-Schemata ins plugs-Vokabular", () => {
    expect(mapConnector("CTYPE2")).toBe("Type 2");
    expect(mapConnector("IEC_62196_T2")).toBe("Type 2"); // zweites Schema
    expect(mapConnector("CCCS2")).toBe("CCS Combo 2");
    expect(mapConnector("IEC_62196_T2_COMBO")).toBe("CCS Combo 2");
    expect(mapConnector("CG105")).toBe("CHAdeMO"); // CHAdeMO-Codierung
    expect(mapConnector("CTESLA")).toBe("Tesla Connector");
  });
  it("reicht unbekannte Typen roh durch", () => {
    expect(mapConnector("PAN")).toBe("PAN");
  });
});

describe("classifyElectricity", () => {
  it("AC_3_PHASE → AC", () => {
    expect(classifyElectricity(["AC_3_PHASE"], 22)).toEqual({ isAc: true, isDc: false });
  });
  it("DC → DC", () => {
    expect(classifyElectricity(["DC"], 150)).toEqual({ isAc: false, isDc: true });
  });
  it("ohne Angabe + >=50 kW → DC-Heuristik", () => {
    expect(classifyElectricity([], 150)).toEqual({ isAc: false, isDc: true });
  });
});

describe("mapStatus", () => {
  it("mappt aufs Status-Vokabular inkl. Unknown-Fallback", () => {
    expect(mapStatus("AVAILABLE")).toBe("Available");
    expect(mapStatus("OCCUPIED")).toBe("Occupied");
    expect(mapStatus("OUT_OF_SERVICE")).toBe("OutOfService");
    expect(mapStatus(null)).toBe("Unknown");
    expect(mapStatus("WHATEVER")).toBe("Unknown");
  });
});

describe("isOpen24h", () => {
  it("ganzwöchig 00:00–24:00 → true", () => {
    expect(isOpen24h(station.openingHours)).toBe(true);
  });
  it("Teilzeiten → false", () => {
    expect(
      isOpen24h([{ fromWeekday: "MONDAY", fromTime: "08:00", toWeekday: "FRIDAY", toTime: "18:00" }]),
    ).toBe(false);
  });
});

describe("mapPointToStation", () => {
  it("mappt einen echten Ladepunkt vollständig auf NewStation", () => {
    const s = mapPointToStation(operator, station, point)!;
    expect(s).toMatchObject({
      evseId: "AT*991*E*PDC*AT1000406*0000001",
      operatorId: "991",
      operatorName: "Porsche Sales & Marketplace GmbH",
      chargingStationId: "E10187829",
      lat: 47.7773,
      lon: 17.0386,
      city: "Andau",
      postalCode: "7163",
      country: "AT",
      nameDe: "Porsche Destination Charging Schwarz Wein GmbH & Co KG",
      plugs: ["Type 2"],
      authModes: ["APP", "CREDIT_CARD"],
      maxPowerKw: 22.17,
      isAc: true,
      isDc: false,
      isOpen24h: true,
      dynamicInfoAvailable: true,
      renewableEnergy: false,
      hotline: "DE 0711 91177500",
    });
  });

  it("verwirft Punkte ohne Koordinaten", () => {
    expect(
      mapPointToStation(operator, { ...station, latitude: null, longitude: null }, {
        ...point,
        latitude: null,
        longitude: null,
      }),
    ).toBeNull();
  });
});

describe("mapPointToStatus", () => {
  it("erzeugt eine station_status-Zeile mit gemapptem Status", () => {
    expect(mapPointToStatus(point)).toEqual({
      evseId: "AT*991*E*PDC*AT1000406*0000001",
      status: "Available",
    });
  });
});
