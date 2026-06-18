import type { NewStation } from "@/lib/db/schema";

/**
 * Adapter für Luxemburger Ladestationen aus **OpenStreetMap** (via Overpass).
 *
 * Hintergrund: LU hat KEINE keyless abrufbare amtliche Bulk-Quelle — der offizielle
 * Chargy-Layer des Géoportail ist nur als WMS-Bild freigegeben, der einzige offene
 * data.public.lu-Datensatz ist ein 2021-Snapshot. OSM ist dagegen aktuell und
 * keyless; das Chargy-/SuperChargy-Netz ist dort vollständig erfasst (`brand=Chargy`).
 * Quelle daher OSM (Lizenz ODbL — die App nutzt ohnehin OSM-Kartenmaterial).
 *
 * Anders als die amtlichen Register (CH/AT/FR/DE): Community-Daten, heterogen
 * getaggt, kein Echtzeit-Status (`dynamicInfoAvailable=false`). evseId =
 * `LU:osm:<typ><id>` (stabile OSM-Element-ID). Klein (~1k Elemente) → ein Abruf.
 */

const COUNTRY = "LU";

// Overpass-Spiegel (Reihenfolge = Fallback). Public-Instanzen, fair use.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

/** Alle charging_station-Elemente in Luxemburg (Knoten/Wege/Relationen). */
const QUERY = `[out:json][timeout:60];
area["ISO3166-1"="LU"][admin_level=2]->.lu;
nwr["amenity"="charging_station"](area.lu);
out center tags;`;

// ---- Roh-Typen -----------------------------------------------------------

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// ---- Mapping-Helfer ------------------------------------------------------

const ns = (e: { type: string; id: number }): string =>
  `${COUNTRY}:osm:${e.type[0]}${e.id}`;

/**
 * OSM-`socket:*`-Schlüssel → plugs[] + AC/DC. Werte sind Stückzahlen; relevant ist
 * die PRÄSENZ des Schlüssels. Vokabular ist Needle-kompatibel (lib/plugs.ts).
 */
const SOCKET_MAP: { key: string; plug: string; dc: boolean }[] = [
  { key: "socket:type2_combo", plug: "CCS Combo 2", dc: true },
  { key: "socket:ccs", plug: "CCS Combo 2", dc: true },
  { key: "socket:chademo", plug: "CHAdeMO", dc: true },
  { key: "socket:tesla_supercharger_ccs", plug: "CCS Combo 2", dc: true },
  { key: "socket:tesla_supercharger", plug: "Tesla Connector", dc: true },
  { key: "socket:type2", plug: "Type 2", dc: false },
  { key: "socket:type2_cable", plug: "Type 2", dc: false },
  { key: "socket:type3", plug: "Type 3", dc: false },
  { key: "socket:type3c", plug: "Type 3", dc: false },
  { key: "socket:schuko", plug: "Schuko", dc: false },
  { key: "socket:typee", plug: "Schuko", dc: false },
];

export function classifyPlugs(tags: Record<string, string>): {
  plugs: string[];
  isAc: boolean;
  isDc: boolean;
} {
  const plugs = new Set<string>();
  let isAc = false;
  let isDc = false;
  for (const { key, plug, dc } of SOCKET_MAP) {
    if (tags[key] != null && tags[key] !== "no") {
      plugs.add(plug);
      if (dc) isDc = true;
      else isAc = true;
    }
  }
  return { plugs: [...plugs], isAc, isDc };
}

/** Höchste Leistung aus allen `*:output`/`*output`/`maxpower`-Tags in kW. */
export function maxPowerKw(tags: Record<string, string>): number | null {
  let max = 0;
  for (const [k, v] of Object.entries(tags)) {
    const key = k.toLowerCase();
    if (!(key.endsWith("output") || key.endsWith("maxpower") || key === "power")) {
      continue;
    }
    for (const part of v.split(/[;,]/)) {
      const m = part.match(/([\d.]+)/);
      if (!m) continue;
      let n = Number(m[1]);
      if (!Number.isFinite(n) || n <= 0) continue;
      if (n >= 1000) n /= 1000; // Watt → kW
      if (n > max) max = n;
    }
  }
  return max > 0 ? Math.round(max * 10) / 10 : null;
}

/** authentication:*=yes → authModes[] (z. B. "membership_card", "app"). */
function authModes(tags: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(tags)) {
    if (k.startsWith("authentication:") && v === "yes") {
      out.push(k.slice("authentication:".length));
    }
  }
  return out;
}

/** Ein Overpass-Element → unsere `stations`-Zeile (null wenn unbrauchbar). */
export function mapElement(e: OverpassElement): NewStation | null {
  const tags = e.tags ?? {};
  if (tags.motorcar === "no") return null; // reine Velo-/Roller-Ladepunkte raus
  const lat = e.lat ?? e.center?.lat ?? null;
  const lon = e.lon ?? e.center?.lon ?? null;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const { plugs, isAc, isDc } = classifyPlugs(tags);
  const power = maxPowerKw(tags);
  // OSM-Tagging ist unvollständig: SuperChargy-Schnelllader (CCS) sind teils nur
  // als `socket:type2` getaggt. Da AC physikalisch bei ~43 kW endet, ist alles
  // ≥50 kW sicher DC — unabhängig von einem vorhandenen AC-Stecker.
  const dc = isDc || (power != null && power >= 50);

  return {
    evseId: ns(e),
    operatorId: null,
    operatorName: tags.operator ?? tags.brand ?? tags.network ?? null,
    chargingStationId: null,
    lat,
    lon,
    city: tags["addr:city"] ?? null,
    postalCode: tags["addr:postcode"] ?? null,
    street:
      [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") ||
      null,
    country: COUNTRY,
    nameEn: tags.name ?? null,
    plugs,
    authModes: authModes(tags),
    maxPowerKw: power,
    isAc,
    isDc: dc,
    isOpen24h: (tags.opening_hours ?? "").trim() === "24/7",
    accessibility: null,
    dynamicInfoAvailable: false, // OSM-Daten, kein Echtzeit-Status
    renewableEnergy: false,
    hotline: tags.phone ?? tags["contact:phone"] ?? null,
    raw: { source: "osm-lu" }, // bewusst KEIN Voll-Payload (Neon-Speicher schonen)
  };
}

export function mapElements(elements: OverpassElement[]): NewStation[] {
  const byId = new Map<string, NewStation>();
  for (const e of elements) {
    const s = mapElement(e);
    if (s) byId.set(s.evseId, s);
  }
  return [...byId.values()];
}

// ---- Fetch-Layer ---------------------------------------------------------

/** Overpass abfragen (mit Spiegel-Fallback) → rohe Elemente. */
export async function fetchOverpass(
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  let lastErr: unknown;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ladestation-app/0.1",
        },
        body: "data=" + encodeURIComponent(QUERY),
        signal: signal ?? AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status} (${url})`);
      const json = (await res.json()) as { elements?: OverpassElement[] };
      return json.elements ?? [];
    } catch (e) {
      lastErr = e;
      console.warn(`[osm-lu] ${url} failed: ${(e as Error).message}`);
    }
  }
  throw lastErr;
}
