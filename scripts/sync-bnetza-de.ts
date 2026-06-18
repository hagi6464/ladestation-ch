/**
 * Deutschland-Sync (Bundesnetzagentur-Ladesäulenregister) als standalone CLI.
 *
 * Löst die aktuelle CSV-URL auf (Dateiname wechselt monatlich), streamt die CSV
 * (~46 MB, Windows-1252, `;`), mappt jede Ladeeinrichtung und upsertet in
 * `stations`. Läuft im GitHub-Action-Runner (kein Vercel-Zeitlimit). Rein
 * statisch — KEIN `station_status`.
 *
 * Nutzung: `pnpm sync:bnetza-de` (CI) bzw. `pnpm sync:bnetza-de:local`.
 * Optional `BNETZA_MAX_ROWS=5000` für einen kleineren Testlauf.
 *
 * Hinweis: upsert-only (wie BFE/AT/FR); verschwundene Einträge werden nicht
 * gelöscht, nur nicht mehr aktualisiert.
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { stations, type NewStation } from "../lib/db/schema";
import { streamLadesaeulen } from "../lib/sources/bnetza-de";

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
  const maxRows = Number(process.env.BNETZA_MAX_ROWS) || undefined;

  // Nach evseId (Ladeeinrichtungs-ID) deduplizieren — Sicherheitsnetz.
  console.log("[sync-de] resolving + streaming BNetzA-CSV …");
  const byId = new Map<string, NewStation>();
  const stats = await streamLadesaeulen((s) => byId.set(s.evseId, s), { maxRows });
  const rows = [...byId.values()];
  console.log(`[sync-de] CSV: ${stats.url}`);
  console.log(
    `[sync-de] Datenzeilen ${stats.dataRows}, gemappt ${stats.mapped}, verworfen ${stats.skipped}, eindeutig ${rows.length}`,
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
      console.log(`[sync-de] upserted ${inserted}/${rows.length}`);
    }
  }

  console.log(
    `[sync-de] done: ${inserted} upserted in ${Math.round((Date.now() - started) / 1000)}s`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-de] fatal:", err);
    process.exit(1);
  });
