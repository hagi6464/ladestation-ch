/**
 * Luxemburg-Sync (OSM/Overpass) als standalone CLI-Script.
 *
 * Holt alle LU-Ladestationen aus OpenStreetMap (~1k Elemente), mappt sie und
 * upsertet in `stations`. Klein genug für einen einzelnen Abruf. Rein statisch —
 * KEIN `station_status`.
 *
 * Nutzung: `pnpm sync:osm-lu` (CI) bzw. `pnpm sync:osm-lu:local`.
 *
 * Hinweis: upsert-only (wie BFE/AT/FR/DE).
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { stations } from "../lib/db/schema";
import { fetchOverpass, mapElements } from "../lib/sources/osm-lu";

const CHUNK = 500;

const UPSERT_SET = {
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

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ist nicht gesetzt");
  }
  const started = Date.now();
  console.log("[sync-lu] querying Overpass …");
  const elements = await fetchOverpass();
  const rows = mapElements(elements);
  console.log(`[sync-lu] rohe Elemente ${elements.length}, gemappt ${rows.length}`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db
      .insert(stations)
      .values(batch)
      .onConflictDoUpdate({ target: stations.evseId, set: UPSERT_SET });
    inserted += batch.length;
  }

  console.log(
    `[sync-lu] done: ${inserted} upserted in ${Math.round((Date.now() - started) / 1000)}s`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-lu] fatal:", err);
    process.exit(1);
  });
