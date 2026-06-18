import type { NewStation } from "@/lib/db/schema";
import { CsvParser, rowsToObjects } from "./csv";

export { rowsToObjects };

/**
 * Adapter für das **Ladesäulenregister der Bundesnetzagentur** (Deutschland) —
 * das offizielle nationale Register öffentlich zugänglicher Ladeeinrichtungen.
 *
 * Quelle ist eine monatlich aktualisierte **CSV** (~46 MB, ~100k Ladeeinrichtungen):
 *   - Encoding Latin-1 / Windows-1252, Trennzeichen `;`, Dezimal-KOMMA
 *   - 10-zeiliger Vorspann; die echte Headerzeile beginnt mit `Ladeeinrichtungs-ID`
 *   - eine Zeile = eine Ladeeinrichtung mit bis zu 6 Steckern (Steckertypen1..6)
 * Der Dateiname enthält ein Datum (…_2026-04-22.csv) → die URL wechselt monatlich,
 * daher wird sie vor dem Sync von der Übersichtsseite gescrapt (resolveCsvUrl).
 *
 * Rein statisch — kein Echtzeit-Status (kein `station_status`). Modell: ein Pin
 * je Ladeeinrichtung; Stecker/Leistung werden über die 6 Slots aggregiert.
 * evseId = `DE:<Ladeeinrichtungs-ID>` (stabiler, eindeutiger Registerschlüssel).
 */

const COUNTRY = "DE";
const SLOTS = 6;

const START_PAGE =
  "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/E-Mobilitaet/Ladesaeulenkarte/start.html";
const DATA_BASE =
  "https://data.bundesnetzagentur.de/Bundesnetzagentur/DE/Fachthemen/ElektrizitaetundGas/E-Mobilitaet/";

// ---- CSV-URL-Auflösung ---------------------------------------------------

/**
 * Ermittelt die aktuelle CSV-URL von der Übersichtsseite (Dateiname wechselt
 * monatlich). Nimmt bei mehreren Treffern den neuesten (höchstes Datum).
 */
export async function resolveCsvUrl(signal?: AbortSignal): Promise<string> {
  const res = await fetch(START_PAGE, {
    headers: { "User-Agent": "ladestation-app/0.1" },
    signal: signal ?? AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`BNetzA-Seite ${res.status}`);
  const html = await res.text();
  const files = [...html.matchAll(/Ladesaeulenregister_BNetzA_(\d{4}-\d{2}-\d{2})\.csv/g)];
  if (files.length === 0) {
    throw new Error("Keine Ladesaeulenregister-CSV auf der BNetzA-Seite gefunden");
  }
  const latest = files
    .map((m) => m[0])
    .sort()
    .at(-1)!;
  return DATA_BASE + latest;
}

// ---- Mapping-Helfer ------------------------------------------------------

/** Dezimal-Komma-Zahl → number|null. */
export function parseNum(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const ns = (id: string): string => `${COUNTRY}:${id}`;

/** Ein BNetzA-Steckertyp-Label → unser plugs[]-Vokabular (Needle-kompatibel). */
export function mapConnector(label: string): string {
  const s = label.toLowerCase();
  if (s.includes("chademo")) return "CHAdeMO";
  if (s.includes("combo") || s.includes("ccs")) return "CCS Combo 2";
  if (s.includes("typ 2") || s.includes("type 2")) return "Type 2";
  if (s.includes("typ 1") || s.includes("type 1")) return "Type 1";
  if (s.includes("schuko")) return "Schuko";
  if (s.includes("cee")) return "CEE";
  return label.trim();
}

/** Alle Steckertypen-Slots → unique plugs[] + AC/DC + max. Stecker-Leistung. */
export function aggregateConnectors(row: Record<string, string>): {
  plugs: string[];
  isAc: boolean;
  isDc: boolean;
  maxConnectorKw: number | null;
} {
  const plugs = new Set<string>();
  let isAc = false;
  let isDc = false;
  let maxConnectorKw: number | null = null;

  for (let i = 1; i <= SLOTS; i++) {
    const cell = row[`Steckertypen${i}`];
    if (!cell?.trim()) continue;
    for (const part of cell.split(";")) {
      const label = part.trim();
      if (!label) continue;
      plugs.add(mapConnector(label));
      const low = label.toLowerCase();
      if (low.startsWith("ac")) isAc = true;
      if (low.startsWith("dc")) isDc = true;
    }
    // Leistungszelle kann mehrere Werte enthalten ("50; 50").
    for (const p of (row[`Nennleistung Stecker${i}`] ?? "").split(";")) {
      const kw = parseNum(p);
      if (kw != null && (maxConnectorKw == null || kw > maxConnectorKw)) {
        maxConnectorKw = kw;
      }
    }
  }
  return { plugs: [...plugs], isAc, isDc, maxConnectorKw };
}

/** Bezahlsysteme (`;`-getrennt, gequotet) → authModes[]. */
function authModes(row: Record<string, string>): string[] {
  return (row.Bezahlsysteme ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function street(row: Record<string, string>): string | null {
  const s = [row["Straße"]?.trim(), row.Hausnummer?.trim()].filter(Boolean).join(" ");
  return s || null;
}

/**
 * Eine Register-Zeile → unsere `stations`-Zeile. null, wenn keine
 * Ladeeinrichtungs-ID, keine gültigen Koordinaten oder Status ≠ „In Betrieb".
 */
export function mapRow(row: Record<string, string>): NewStation | null {
  const id = (row["Ladeeinrichtungs-ID"] ?? "").trim();
  if (!id) return null;
  if ((row.Status ?? "").trim() !== "In Betrieb") return null;

  const lat = parseNum(row.Breitengrad);
  const lon = parseNum(row["Längengrad"]);
  if (lat == null || lon == null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (lat === 0 && lon === 0) return null;

  const { plugs, isAc, isDc, maxConnectorKw } = aggregateConnectors(row);
  const deviceKw = parseNum(row["Nennleistung Ladeeinrichtung [kW]"]);
  const maxPowerKw = maxConnectorKw ?? deviceKw;
  // Heuristik wie bei BFE/AT/FR: ohne explizite DC-Angabe ab 50 kW → DC.
  const dc = isDc || (!isAc && maxPowerKw != null && maxPowerKw >= 50);

  return {
    evseId: ns(id),
    operatorId: null,
    operatorName: row.Betreiber?.trim() || null,
    chargingStationId: null,
    lat,
    lon,
    city: row.Ort?.trim() || null,
    postalCode: row.Postleitzahl?.trim() || null,
    street: street(row),
    country: COUNTRY,
    nameDe:
      row.Standortbezeichnung?.trim() ||
      row["Anzeigename (Karte)"]?.trim() ||
      null,
    plugs,
    authModes: authModes(row),
    maxPowerKw,
    isAc,
    isDc: dc,
    isOpen24h: (row["Öffnungszeiten"] ?? "").trim() === "247",
    accessibility: null,
    dynamicInfoAvailable: false, // Register ist statisch, kein Echtzeit-Status
    renewableEnergy: false,
    hotline: null,
    raw: { source: "bnetza-de" }, // bewusst KEIN Voll-Payload (Neon-Speicher schonen)
  };
}

// ---- Fetch-Layer ---------------------------------------------------------

/**
 * Streamt die Register-CSV (Windows-1252, `;`) und ruft `onRow` für jede gemappte
 * Ladeeinrichtung auf. Überspringt den Vorspann bis zur Headerzeile
 * (`Ladeeinrichtungs-ID`). `maxRows` begrenzt (PoC); danach Stream-Abbruch.
 */
export async function streamLadesaeulen(
  onRow: (s: NewStation) => void,
  opts: { url?: string; maxRows?: number; signal?: AbortSignal } = {},
): Promise<{ dataRows: number; mapped: number; skipped: number; url: string }> {
  const url = opts.url ?? (await resolveCsvUrl(opts.signal));
  const res = await fetch(url, {
    headers: { "User-Agent": "ladestation-app/0.1" },
    signal: opts.signal ?? AbortSignal.timeout(300_000),
  });
  if (!res.ok || !res.body) throw new Error(`BNetzA-CSV ${res.status} ${res.statusText}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder("windows-1252");
  const parser = new CsvParser(";");
  let header: string[] | null = null;
  let dataRows = 0;
  let mapped = 0;
  let skipped = 0;

  const handle = (rows: string[][]): boolean => {
    for (const r of rows) {
      if (!header) {
        if (r[0]?.trim() === "Ladeeinrichtungs-ID") header = r.map((h) => h.trim());
        continue; // Vorspann + Gruppen-Headerzeile überspringen
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
  return { dataRows, mapped, skipped, url };
}
