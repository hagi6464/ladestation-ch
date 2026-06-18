import { describe, expect, it } from "vitest";
import {
  aggregateConnectors,
  mapConnector,
  mapRow,
  parseNum,
  rowsToObjects,
} from "./bnetza-de";
import { parseCsv } from "./csv";

// Echte Headerzeile + zwei echte Datenzeilen aus dem Register (Auszug, `;`).
const HEADER =
  "Ladeeinrichtungs-ID;Betreiber;Anzeigename (Karte);Status;Art der Ladeeinrichtung;Anzahl Ladepunkte;Nennleistung Ladeeinrichtung [kW];Inbetriebnahmedatum;Straße;Hausnummer;Adresszusatz;Postleitzahl;Ort;Kreis/kreisfreie Stadt;Bundesland;Breitengrad;Längengrad;Standortbezeichnung;Informationen zum Parkraum;Bezahlsysteme;Öffnungszeiten;Öffnungszeiten: Wochentage;Öffnungszeiten: Tageszeiten;Steckertypen1;Nennleistung Stecker1;EVSE-ID1;Public Key1;Steckertypen2;Nennleistung Stecker2;EVSE-ID2;Public Key2;Steckertypen3;Nennleistung Stecker3;EVSE-ID3;Public Key3;Steckertypen4;Nennleistung Stecker4;EVSE-ID4;Public Key4;Steckertypen5;Nennleistung Stecker5;EVSE-ID5;Public Key5;Steckertypen6;Nennleistung Stecker6;EVSE-ID6;Public Key6";

// AC-Ladeeinrichtung (Albwerk), Status In Betrieb, 24/7 (Öffnungszeiten "247").
const AC_ROW =
  '1010338;Albwerk Elektro- und Kommunikationstechnik GmbH;Albwerk;In Betrieb;Normalladeeinrichtung;2;22;11.01.2020;Am Berg;1;;72535;Heroldstatt;Landkreis Alb-Donau-Kreis;Baden-Württemberg;48,442398;9,659075;;Keine Beschränkung;"RFID-Karte;Onlinezahlungsverfahren";247;"Montag; Dienstag";"00:00-23:59; 00:00-23:59";AC Typ 2 Steckdose;22;DEAEWE002501;KEY1;AC Typ 2 Steckdose;22;DEAEWE002502;KEY2;;;;;;;;;;;;;;;;';

// DC-Schnelllader (EnBW): AC Typ 2 + DC CCS/CHAdeMO in einer Slot-Zelle.
const DC_ROW =
  '1025458;EnBW mobility+ AG und Co.KG;;In Betrieb;Schnellladeeinrichtung;2;93;19.03.2019;Hauptstraße;91c;;73340;Amstetten;Landkreis Alb-Donau-Kreis;Baden-Württemberg;48,578534;9,87484;;;"Onlinezahlungsverfahren;RFID-Karte";Keine Angabe;;;AC Typ 2 Fahrzeugkupplung;43;;;"DC Fahrzeugkupplung Typ Combo 2 (CCS); DC CHAdeMO";"50; 50";;;;;;;;;;;;;;;;;;';

function obj(line: string): Record<string, string> {
  const rows = parseCsv(HEADER + "\n" + line + "\n", ";");
  return rowsToObjects(rows[0], rows.slice(1))[0];
}

describe("parseNum", () => {
  it("Dezimalkomma → number", () => {
    expect(parseNum("48,442398")).toBeCloseTo(48.442398);
    expect(parseNum("22")).toBe(22);
  });
  it("leer/Unsinn → null", () => {
    expect(parseNum("")).toBeNull();
    expect(parseNum("Keine Angabe")).toBeNull();
  });
});

describe("mapConnector", () => {
  it("mappt BNetzA-Labels aufs Vokabular", () => {
    expect(mapConnector("AC Typ 2 Steckdose")).toBe("Type 2");
    expect(mapConnector("DC Fahrzeugkupplung Typ Combo 2 (CCS)")).toBe("CCS Combo 2");
    expect(mapConnector("DC CHAdeMO")).toBe("CHAdeMO");
    expect(mapConnector("AC Schuko")).toBe("Schuko");
  });
});

describe("aggregateConnectors", () => {
  it("AC-Reihe: nur Type 2, AC, 22 kW", () => {
    const a = aggregateConnectors(obj(AC_ROW));
    expect(a.plugs).toEqual(["Type 2"]);
    expect(a).toMatchObject({ isAc: true, isDc: false, maxConnectorKw: 22 });
  });
  it("DC-Reihe: Multi-Stecker-Zelle → Type 2 + CCS + CHAdeMO, DC, 50 kW", () => {
    const a = aggregateConnectors(obj(DC_ROW));
    expect(new Set(a.plugs)).toEqual(new Set(["Type 2", "CCS Combo 2", "CHAdeMO"]));
    expect(a.isAc).toBe(true);
    expect(a.isDc).toBe(true);
    expect(a.maxConnectorKw).toBe(50);
  });
});

describe("mapRow", () => {
  it("mappt eine AC-Ladeeinrichtung vollständig", () => {
    const s = mapRow(obj(AC_ROW))!;
    expect(s).toMatchObject({
      evseId: "DE:1010338",
      operatorName: "Albwerk Elektro- und Kommunikationstechnik GmbH",
      chargingStationId: null,
      lat: 48.442398,
      lon: 9.659075,
      city: "Heroldstatt",
      postalCode: "72535",
      street: "Am Berg 1",
      country: "DE",
      plugs: ["Type 2"],
      authModes: ["RFID-Karte", "Onlinezahlungsverfahren"],
      maxPowerKw: 22,
      isAc: true,
      isDc: false,
      isOpen24h: true,
      dynamicInfoAvailable: false,
    });
    expect(s.raw).toEqual({ source: "bnetza-de" });
  });

  it("mappt einen DC-Schnelllader (maxPowerKw = max. Stecker, nicht Geräteleistung)", () => {
    const s = mapRow(obj(DC_ROW))!;
    expect(s.evseId).toBe("DE:1025458");
    expect(s.isDc).toBe(true);
    expect(s.maxPowerKw).toBe(50); // nicht 93 (Geräte-Nennleistung)
    expect(s.isOpen24h).toBe(false); // "Keine Angabe"
  });

  it("verwirft Zeilen ohne ID, ohne Koordinaten oder nicht In Betrieb", () => {
    expect(mapRow(obj(AC_ROW.replace("1010338", "")))).toBeNull();
    expect(mapRow(obj(AC_ROW.replace("In Betrieb", "Außer Betrieb")))).toBeNull();
    expect(mapRow(obj(AC_ROW.replace("48,442398", "")))).toBeNull();
  });
});
