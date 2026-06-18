/**
 * Österreich-Sync (E-Control Ladestellenverzeichnis) als standalone CLI-Script.
 *
 * Crawlt das operator-zentrierte API-Modell (operators → stations → points) und
 * upsertet die Ladepunkte in `stations` + `station_status`. Wegen des N+1-Modells
 * (~1110 Operatoren, ~12.6k Stationen) läuft das mit beschränkter Parallelität und
 * gehört in einen GitHub-Action-Runner (kein Vercel-Funktions-Zeitlimit).
 *
 * Auth: ECONTROL_API_KEY/USER + Referer (freigeschaltete Domain) — siehe
 * lib/sources/econtrol-at.ts. DB: DATABASE_URL (Neon).
 *
 * Nutzung: `pnpm sync:econtrol-at` (CI) bzw. `pnpm sync:econtrol-at:local`.
 * Optional `EC_MAX_OPERATORS=50` für einen kleineren Testlauf.
 *
 * Hinweis: v1 ist upsert-only (wie der BFE-Sync); verschwundene AT-Stationen
 * werden nicht gelöscht, nur nicht mehr aktualisiert.
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  stations,
  stationStatus,
  type NewStation,
  type NewStationStatus,
} from "../lib/db/schema";
import {
  fetchOperators,
  fetchStations,
  fetchPoints,
  mapPointToStation,
  mapPointToStatus,
} from "../lib/sources/econtrol-at";

const STATION_CONCURRENCY = 8; // gleichzeitige stations-Abfragen (über Operatoren)
const POINT_CONCURRENCY = 12; // gleichzeitige points-Abfragen (über Stationen)
const CHUNK = 500;

const STATION_UPSERT_SET = {
  operatorId: sql`excluded.operator_id`,
  operatorName: sql`excluded.operator_name`,
  chargingStationId: sql`excluded.charging_station_id`,
  lat: sql`excluded.lat`,
  lon: sql`excluded.lon`,
  city: sql`excluded.city`,
  postalCode: sql`excluded.postal_code`,
  street: sql`excluded.street`,
  country: sql`excluded.country`,
  nameDe: sql`excluded.name_de`,
  nameFr: sql`excluded.name_fr`,
  nameIt: sql`excluded.name_it`,
  nameEn: sql`excluded.name_en`,
  plugs: sql`excluded.plugs`,
  authModes: sql`excluded.auth_modes`,
  maxPowerKw: sql`excluded.max_power_kw`,
  isAc: sql`excluded.is_ac`,
  isDc: sql`excluded.is_dc`,
  isOpen24h: sql`excluded.is_open_24h`,
  accessibility: sql`excluded.accessibility`,
  dynamicInfoAvailable: sql`excluded.dynamic_info_available`,
  renewableEnergy: sql`excluded.renewable_energy`,
  hotline: sql`excluded.hotline`,
  raw: sql`excluded.raw`,
  fetchedAt: sql`now()`,
};

/** Beschränkte Parallelität: arbeitet `items` mit `n` gleichzeitigen Workern ab. */
async function mapPool<T, R>(
  items: T[],
  n: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

async function main() {
  if (!process.env.ECONTROL_API_KEY && !process.env.ECONTROL_API_USER) {
    throw new Error("ECONTROL_API_KEY/USER ist nicht gesetzt");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ist nicht gesetzt");
  }
  const started = Date.now();
  const maxOperators = Number(process.env.EC_MAX_OPERATORS) || Infinity;

  console.log("[sync-at] fetching operators …");
  let operators = await fetchOperators();
  if (Number.isFinite(maxOperators)) operators = operators.slice(0, maxOperators);
  console.log(`[sync-at] operators: ${operators.length}`);

  // Phase 1: Stationen je Operator (parallel über Operatoren).
  let scanned = 0;
  const opStations = await mapPool(operators, STATION_CONCURRENCY, async (op) => {
    let list: Awaited<ReturnType<typeof fetchStations>> = [];
    try {
      list = await fetchStations(op.operatorId);
    } catch (e) {
      console.warn(`[sync-at] stations(${op.operatorId}) failed: ${(e as Error).message}`);
    }
    scanned++;
    if (scanned % 200 === 0) console.log(`[sync-at] operators scanned ${scanned}/${operators.length}`);
    return list.map((st) => ({ op, st }));
  });
  const stationJobs = opStations.flat();
  console.log(`[sync-at] stations total: ${stationJobs.length}`);

  // Phase 2: Ladepunkte je Station (parallel über Stationen) → Mapping.
  let done = 0;
  const rowsNested = await mapPool(stationJobs, POINT_CONCURRENCY, async ({ op, st }) => {
    const out: { station: NewStation; status: NewStationStatus }[] = [];
    try {
      const points = await fetchPoints(op.operatorId, st.stationId);
      for (const p of points) {
        const station = mapPointToStation(op, st, p);
        if (station) out.push({ station, status: mapPointToStatus(p) });
      }
    } catch (e) {
      console.warn(`[sync-at] points(${st.stationId}) failed: ${(e as Error).message}`);
    }
    done++;
    if (done % 1000 === 0) console.log(`[sync-at] stations processed ${done}/${stationJobs.length}`);
    return out;
  });

  // EVSE-Zeilen einsammeln + nach evseId deduplizieren (Kollisionen vermeiden).
  const byId = new Map<string, { station: NewStation; status: NewStationStatus }>();
  for (const row of rowsNested.flat()) byId.set(row.station.evseId, row);
  const stationRows = [...byId.values()].map((r) => r.station);
  const statusRows = [...byId.values()].map((r) => r.status);
  console.log(`[sync-at] mapped EVSE rows: ${stationRows.length}`);

  // Upsert stations.
  let n = 0;
  for (let i = 0; i < stationRows.length; i += CHUNK) {
    const batch = stationRows.slice(i, i + CHUNK);
    await db
      .insert(stations)
      .values(batch)
      .onConflictDoUpdate({ target: stations.evseId, set: STATION_UPSERT_SET });
    n += batch.length;
  }
  console.log(`[sync-at] upserted stations: ${n}`);

  // Upsert station_status.
  let s = 0;
  for (let i = 0; i < statusRows.length; i += CHUNK) {
    const batch = statusRows.slice(i, i + CHUNK);
    await db
      .insert(stationStatus)
      .values(batch)
      .onConflictDoUpdate({
        target: stationStatus.evseId,
        set: { status: sql`excluded.status`, fetchedAt: sql`now()` },
      });
    s += batch.length;
  }
  console.log(`[sync-at] upserted status: ${s}`);
  console.log(`[sync-at] done in ${Math.round((Date.now() - started) / 1000)}s`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-at] fatal:", err);
    process.exit(1);
  });
