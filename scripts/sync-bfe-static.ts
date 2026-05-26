/**
 * BFE-Static-Sync als standalone CLI-Script.
 *
 * Wird vom GitHub Action Runner ausgeführt (kein Vercel-Function-Timeout-Limit).
 * Lädt das BFE-OICP-JSON (~25 MB, ~18k Stationen), parst es und upsertet
 * direkt in die Neon-Datenbank.
 *
 * Lokal nutzbar: `pnpm sync:static` (braucht DATABASE_URL in .env.local).
 * In CI: braucht DATABASE_URL als Secret.
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { stations } from "../lib/db/schema";
import { extractStations, fetchStaticData } from "../lib/bfe";

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
    throw new Error("DATABASE_URL is not set");
  }
  const started = Date.now();
  console.log("[sync-bfe-static] fetching BFE payload...");
  const payload = await fetchStaticData();
  console.log("[sync-bfe-static] parsing...");
  const rows = extractStations(payload);
  console.log(`[sync-bfe-static] extracted ${rows.length} stations`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db
      .insert(stations)
      .values(batch)
      .onConflictDoUpdate({ target: stations.evseId, set: UPSERT_SET });
    inserted += batch.length;
    if ((i / CHUNK) % 5 === 0) {
      console.log(
        `[sync-bfe-static] progress ${inserted}/${rows.length}`,
      );
    }
  }

  console.log(
    `[sync-bfe-static] done: ${inserted} upserted in ${Date.now() - started} ms`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-bfe-static] fatal:", err);
    process.exit(1);
  });
