import { describe, expect, it } from "vitest";
import {
  buildPlugs,
  classifyElectricity,
  CsvParser,
  isOpen24h,
  mapRow,
  normalizePowerKw,
  parseCoords,
  parseCsv,
  rowsToObjects,
} from "./irve-fr";

// Realistischer IRVE-Header (Auszug der genutzten Spalten, Etalab-Schema).
const HEADER = [
  "nom_amenageur",
  "nom_operateur",
  "telephone_operateur",
  "nom_enseigne",
  "id_station_itinerance",
  "nom_station",
  "adresse_station",
  "coordonneesXY",
  "id_pdc_itinerance",
  "puissance_nominale",
  "prise_type_ef",
  "prise_type_2",
  "prise_type_combo_ccs",
  "prise_type_chademo",
  "prise_type_autre",
  "condition_acces",
  "horaires",
  "accessibilite_pmr",
];

function rowObj(over: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {
    nom_amenageur: "Ville de Paris",
    nom_operateur: "Total Marketing France",
    telephone_operateur: "0123456789",
    nom_enseigne: "Belib'",
    id_station_itinerance: "FRS01PSAA",
    nom_station: "Rue de Rivoli",
    adresse_station: "12 Rue de Rivoli, 75004 Paris",
    coordonneesXY: "[2.35100,48.85600]",
    id_pdc_itinerance: "FRS01EPSAA1",
    puissance_nominale: "22",
    prise_type_ef: "false",
    prise_type_2: "true",
    prise_type_combo_ccs: "false",
    prise_type_chademo: "false",
    prise_type_autre: "false",
    condition_acces: "Accès libre",
    horaires: "24/7",
    accessibilite_pmr: "Accessible mais non réservé PMR",
  };
  return { ...base, ...over };
}

describe("CsvParser", () => {
  it("parst gequotete Felder mit Komma, Koordinaten und escapte Quotes", () => {
    const csv =
      'a,b,c\r\n' +
      '"12 Rue, Paris","[2.35,48.85]","L\'""Étoile"""\r\n' +
      "x,y,z\n";
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["a", "b", "c"]);
    expect(rows[1]).toEqual(["12 Rue, Paris", "[2.35,48.85]", 'L\'"Étoile"']);
    expect(rows[2]).toEqual(["x", "y", "z"]);
  });

  it("hält Zustand über Chunk-Grenzen (gequotetes Feld zerschnitten)", () => {
    const p = new CsvParser();
    const a = p.push('"Rue de ');
    const b = p.push('Rivoli, 4",22\n');
    expect(a).toEqual([]);
    expect([...b, ...p.end()]).toEqual([["Rue de Rivoli, 4", "22"]]);
  });

  it("rowsToObjects bildet Header → Werte ab", () => {
    expect(rowsToObjects(["x", "y"], [["1", "2"]])).toEqual([{ x: "1", y: "2" }]);
  });
});

describe("parseCoords", () => {
  it("[lon,lat] → [lat,lon]", () => {
    expect(parseCoords("[2.351,48.856]")).toEqual([48.856, 2.351]);
  });
  it("verkraftet Leerzeichen", () => {
    expect(parseCoords("[2.35, 48.85]")).toEqual([48.85, 2.35]);
  });
  it("verwirft 0/0 und Unsinn", () => {
    expect(parseCoords("[0,0]")).toBeNull();
    expect(parseCoords("")).toBeNull();
    expect(parseCoords("[2.35]")).toBeNull();
  });
});

describe("normalizePowerKw", () => {
  it("kW bleibt kW", () => {
    expect(normalizePowerKw("22")).toBe(22);
    expect(normalizePowerKw("3,7")).toBe(3.7);
  });
  it("Watt (≥1000) → kW", () => {
    expect(normalizePowerKw("22000")).toBe(22);
  });
  it("0/leer → null", () => {
    expect(normalizePowerKw("0")).toBeNull();
    expect(normalizePowerKw("")).toBeNull();
  });
});

describe("buildPlugs + classifyElectricity", () => {
  it("Type 2 → AC", () => {
    const row = rowObj();
    expect(buildPlugs(row)).toEqual(["Type 2"]);
    expect(classifyElectricity(row, 22)).toEqual({ isAc: true, isDc: false });
  });
  it("CCS+CHAdeMO → DC", () => {
    const row = rowObj({
      prise_type_2: "false",
      prise_type_combo_ccs: "true",
      prise_type_chademo: "true",
    });
    expect(buildPlugs(row)).toEqual(["CCS Combo 2", "CHAdeMO"]);
    expect(classifyElectricity(row, 150)).toEqual({ isAc: false, isDc: true });
  });
  it("ohne Steckerangabe + ≥50 kW → DC-Heuristik", () => {
    const row = rowObj({ prise_type_2: "false", prise_type_ef: "false" });
    expect(classifyElectricity(row, 150)).toEqual({ isAc: false, isDc: true });
  });
});

describe("isOpen24h", () => {
  it("24/7 → true", () => expect(isOpen24h("24/7")).toBe(true));
  it("Mo-Su 00:00-24:00 → true", () =>
    expect(isOpen24h("Mo-Su 00:00-24:00")).toBe(true));
  it("Teilzeiten → false", () =>
    expect(isOpen24h("Mo-Fr 08:00-18:00")).toBe(false));
});

describe("mapRow", () => {
  it("mappt eine echte IRVE-Zeile vollständig auf NewStation", () => {
    const s = mapRow(rowObj())!;
    expect(s).toMatchObject({
      evseId: "FR:FRS01EPSAA1",
      operatorId: null,
      operatorName: "Total Marketing France",
      chargingStationId: "FR:FRS01PSAA",
      lat: 48.856,
      lon: 2.351,
      postalCode: "75004",
      city: "Paris",
      country: "FR",
      nameFr: "Rue de Rivoli",
      plugs: ["Type 2"],
      maxPowerKw: 22,
      isAc: true,
      isDc: false,
      isOpen24h: true,
      dynamicInfoAvailable: false,
      hotline: "0123456789",
    });
    expect(s.raw).toEqual({ source: "irve-fr" });
  });

  it("verwirft Zeilen ohne id_pdc oder Platzhalter", () => {
    expect(mapRow(rowObj({ id_pdc_itinerance: "" }))).toBeNull();
    expect(mapRow(rowObj({ id_pdc_itinerance: "Non concerné" }))).toBeNull();
  });

  it("verwirft Zeilen ohne gültige Koordinaten", () => {
    expect(mapRow(rowObj({ coordonneesXY: "" }))).toBeNull();
  });

  it("end-to-end via parseCsv + rowsToObjects", () => {
    const line = HEADER.join(",");
    const data =
      '"Ville de Paris","Total Marketing France","0123456789","Belib\'","FRS01PSAA","Rue de Rivoli","12 Rue de Rivoli, 75004 Paris","[2.35100,48.85600]","FRS01EPSAA1","22","false","true","false","false","false","Accès libre","24/7","ok"';
    const rows = parseCsv(line + "\n" + data + "\n");
    const objs = rowsToObjects(rows[0], rows.slice(1));
    const s = mapRow(objs[0])!;
    expect(s.evseId).toBe("FR:FRS01EPSAA1");
    expect(s.city).toBe("Paris");
  });
});
