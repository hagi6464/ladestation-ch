import type { NewStation } from "@/lib/db/schema";
import { CsvParser, parseCsv, rowsToObjects } from "./csv";

// Rückwärtskompatibler Re-Export (Tests/PoC importieren diese aus dem Adapter).
export { CsvParser, parseCsv, rowsToObjects };

/**
 * Adapter für die französische **Base nationale des IRVE** (Infrastructures de
 * Recharge pour Véhicules Électriques) — das konsolidierte, offizielle Register
 * auf transport.data.gouv.fr (Etalab-Schema `schema-irve-statique`).
 *
 * Quelle ist eine grosse konsolidierte **CSV** (~150 MB, ~150k Ladepunkte), kein
 * Operator-Crawl wie bei AT und kein Bulk-JSON wie bei CH. Eine Zeile = ein
 * Ladepunkt (`id_pdc_itinerance`). Die Daten sind **rein statisch** — es gibt
 * keinen Echtzeit-Status (kein `station_status`), `dynamicInfoAvailable=false`.
 *
 * CSV-Eigenheiten: UTF-8, Trennzeichen `,`, Felder mit Komma/Zeilenumbruch sind
 * gequotet (Adressen, `coordonneesXY`). Wegen der Grösse wird gestreamt geparst
 * (siehe CsvParser); Felder werden nach Header-Name (nicht Position) gelesen.
 */

const COUNTRY = "FR";

/** Stabile data.gouv.fr-Ressourcen-URL der konsolidierten IRVE-CSV (Etalab). */
export const IRVE_CSV_URL =
  "https://www.data.gouv.fr/api/1/datasets/r/eb76d20a-8501-400e-b336-d85724de5435";

// ---- Mapping-Helfer ------------------------------------------------------

/** `[lon,lat]` (WGS84) → `[lat, lon]`; null bei fehlenden/ungültigen Koordinaten. */
export function parseCoords(
  raw: string | null | undefined,
): [number, number] | null {
  if (!raw) return null;
  const m = raw.replace(/[[\]\s]/g, "").split(",");
  if (m.length !== 2) return null;
  const lon = Number(m[0]);
  const lat = Number(m[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (lat === 0 && lon === 0) return null;
  return [lat, lon];
}

/**
 * `puissance_nominale` → kW. Das Feld ist laut Schema kW, viele Betreiber tragen
 * aber Watt ein (z. B. 22000). Heuristik: Werte ≥ 1000 als Watt interpretieren.
 */
export function normalizePowerKw(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const kw = n >= 1000 ? n / 1000 : n;
  return Math.round(kw * 10) / 10;
}

function isTrue(v: string | null | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "oui";
}

/** prise_type_*-Booleans → plugs[] (kompatibel mit lib/plugs.ts-Needles). */
export function buildPlugs(row: Record<string, string>): string[] {
  const plugs: string[] = [];
  if (isTrue(row.prise_type_2)) plugs.push("Type 2");
  if (isTrue(row.prise_type_combo_ccs)) plugs.push("CCS Combo 2");
  if (isTrue(row.prise_type_chademo)) plugs.push("CHAdeMO");
  if (isTrue(row.prise_type_ef)) plugs.push("Schuko");
  if (isTrue(row.prise_type_autre)) plugs.push("Autre");
  return plugs;
}

/** AC/DC aus Steckertypen + Leistungs-Heuristik (≥50 kW → DC), wie bei BFE/AT. */
export function classifyElectricity(
  row: Record<string, string>,
  powerKw: number | null,
): { isAc: boolean; isDc: boolean } {
  const isAc = isTrue(row.prise_type_2) || isTrue(row.prise_type_ef);
  let isDc = isTrue(row.prise_type_combo_ccs) || isTrue(row.prise_type_chademo);
  if (!isAc && !isDc && powerKw != null && powerKw >= 50) isDc = true;
  return { isAc, isDc };
}

/** `horaires`-Freitext → 24h? (z. B. "24/7" oder Mo-Su 00:00-24:00). */
export function isOpen24h(raw: string | null | undefined): boolean {
  const s = (raw ?? "").toLowerCase().replace(/\s/g, "");
  if (!s) return false;
  if (s.includes("24/7")) return true;
  return /mo-su00:00-(24:00|23:59)/.test(s);
}

/** Stadt/PLZ aus dem Freitext `adresse_station` heuristisch ziehen. */
function parseAddress(addr: string | null | undefined): {
  postalCode: string | null;
  city: string | null;
} {
  if (!addr) return { postalCode: null, city: null };
  const m = addr.match(/\b(\d{5})\b\s*(.*)$/);
  if (!m) return { postalCode: null, city: null };
  const city = m[2]?.trim() || null;
  return { postalCode: m[1], city };
}

/**
 * Länder-Namespace für IDs. FR-itinerance-IDs sind NICHT garantiert „FR…"
 * (CPOs nutzen beliebige Präfixe, z. B. „ATHTBE…" für eine Station im Elsass) —
 * ohne Namespace droht Kollision mit dem globalen evse_id-Primärschlüssel
 * (CH/AT). Auf chargingStationId gleich angewandt, damit die Stations-Gruppierung
 * (`charging_station_id <> evse_id`) länderintern bleibt.
 */
const ns = (id: string): string => `${COUNTRY}:${id}`;

/** Bevorzugte Betreiberbezeichnung: Operator → Enseigne → Aménageur. */
function operatorName(row: Record<string, string>): string | null {
  return (
    row.nom_operateur?.trim() ||
    row.nom_enseigne?.trim() ||
    row.nom_amenageur?.trim() ||
    null
  );
}

/**
 * Eine IRVE-Zeile → unsere `stations`-Zeile. null, wenn `id_pdc_itinerance`
 * fehlt/Platzhalter ist oder keine gültigen Koordinaten vorliegen. evseId ist
 * `id_pdc_itinerance` (beginnt mit Ländercode „FR", kollidiert nicht mit CH/AT).
 */
export function mapRow(row: Record<string, string>): NewStation | null {
  const id = (row.id_pdc_itinerance ?? "").trim();
  // Platzhalter aus realen Daten ("Non concerné", "non renseigné", ...) verwerfen.
  if (!id || /^non[\s-]?(concern|renseign)/i.test(id)) return null;
  const coords = parseCoords(row.coordonneesXY);
  if (!coords) return null;
  const [lat, lon] = coords;

  const powerKw = normalizePowerKw(row.puissance_nominale);
  const { isAc, isDc } = classifyElectricity(row, powerKw);
  const { postalCode, city } = parseAddress(row.adresse_station);

  const stationId = row.id_station_itinerance?.trim();
  return {
    evseId: ns(id),
    operatorId: null,
    operatorName: operatorName(row),
    chargingStationId: stationId ? ns(stationId) : null,
    lat,
    lon,
    city,
    postalCode,
    street: row.adresse_station?.trim() || null,
    country: COUNTRY,
    nameFr: row.nom_station?.trim() || null,
    plugs: buildPlugs(row),
    authModes: [],
    maxPowerKw: powerKw,
    isAc,
    isDc,
    isOpen24h: isOpen24h(row.horaires),
    accessibility: row.accessibilite_pmr?.trim() || null,
    dynamicInfoAvailable: false, // IRVE-Konsolidat ist statisch, kein Echtzeit-Status
    renewableEnergy: false,
    hotline: row.telephone_operateur?.trim() || null,
    raw: { source: "irve-fr" }, // bewusst KEIN Voll-Payload (Neon-Speicher schonen)
  };
}

// ---- Fetch-Layer ---------------------------------------------------------

/**
 * Streamt die konsolidierte IRVE-CSV und ruft `onRow` für jede gemappte Station
 * auf. `maxRows` begrenzt (PoC); bei Erreichen wird der Stream abgebrochen.
 * Liefert Zähler für Diagnostik.
 */
export async function streamIrve(
  onRow: (s: NewStation) => void,
  opts: { maxRows?: number; signal?: AbortSignal } = {},
): Promise<{ dataRows: number; mapped: number; skipped: number }> {
  const res = await fetch(IRVE_CSV_URL, {
    headers: { Accept: "text/csv", "User-Agent": "ladestation-app/0.1" },
    signal: opts.signal ?? AbortSignal.timeout(300_000),
  });
  if (!res.ok || !res.body) {
    throw new Error(`IRVE ${res.status} ${res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = new CsvParser();
  let header: string[] | null = null;
  let dataRows = 0;
  let mapped = 0;
  let skipped = 0;

  const handle = (rows: string[][]): boolean => {
    for (const r of rows) {
      if (!header) {
        header = r.map((h) => h.replace(/^﻿/, "").trim());
        continue;
      }
      dataRows++;
      const obj: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? "";
      const station = mapRow(obj);
      if (station) {
        onRow(station);
        mapped++;
      } else {
        skipped++;
      }
      if (opts.maxRows && dataRows >= opts.maxRows) return true;
    }
    return false;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (handle(parser.push(decoder.decode(value, { stream: true })))) break;
    }
    handle(parser.end());
  } finally {
    await reader.cancel().catch(() => {});
  }
  return { dataRows, mapped, skipped };
}
