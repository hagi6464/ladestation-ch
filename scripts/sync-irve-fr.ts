/**
 * Frankreich-Sync (Base nationale des IRVE) als standalone CLI-Script.
 *
 * Streamt die konsolidierte CSV (~150 MB, ~150k Ladepunkte) von data.gouv.fr,
 * mappt jede Zeile und upsertet in `stations`. Wegen der Grösse läuft das in
 * einem GitHub-Action-Runner (kein Vercel-Funktions-Zeitlimit). Rein statisch —
 * KEIN `station_status` (IRVE hat keinen Echtzeit-Status).
 *
 * Nutzung: `pnpm sync:irve-fr` (CI) bzw. `pnpm sync:irve-fr:local`.
 * Optional `IRVE_MAX_ROWS=5000` für einen kleineren Testlauf.
 *
 * Hinweis: upsert-only (wie BFE/AT); verschwundene FR-Punkte werden nicht
 * gelöscht, nur nicht mehr aktualisiert.
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { stations, type NewStation } from "../lib/db/schema";
import { streamIrve } from "../lib/sources/irve-fr";

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
  const maxRows = Number(process.env.IRVE_MAX_ROWS) || undefined;

  // Nach evseId deduplizieren — das Konsolidat enthält bekanntlich Duplikate.
  console.log("[sync-fr] streaming IRVE-CSV …");
  const byId = new Map<string, NewStation>();
  const stats = await streamIrve((s) => byId.set(s.evseId, s), { maxRows });
  const rows = [...byId.values()];
  console.log(
    `[sync-fr] Datenzeilen ${stats.dataRows}, gemappt ${stats.mapped}, verworfen ${stats.skipped}, eindeutig ${rows.length}`,
  );

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db
      .insert(stations)
      .values(batch)
      .onConflictDoUpdate({ target: stations.evseId, set: UPSERT_SET });
    inserted += batch.length;
    if ((i / CHUNK) % 20 === 0) {
      console.log(`[sync-fr] upserted ${inserted}/${rows.length}`);
    }
  }

  console.log(
    `[sync-fr] done: ${inserted} upserted in ${Math.round((Date.now() - started) / 1000)}s`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-fr] fatal:", err);
    process.exit(1);
  });
