import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { stations } from "@/lib/db/schema";
import { extractStations, fetchStaticData } from "@/lib/bfe";
import { cronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    console.log("[sync-bfe-static] fetching BFE payload...");
    const payload = await fetchStaticData();
    console.log("[sync-bfe-static] parsing...");
    const rows = extractStations(payload);
    console.log(`[sync-bfe-static] extracted ${rows.length} stations`);

    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      try {
        await db
          .insert(stations)
          .values(batch)
          .onConflictDoUpdate({ target: stations.evseId, set: UPSERT_SET });
        inserted += batch.length;
      } catch (err) {
        console.error(
          `[sync-bfe-static] batch ${i}-${i + batch.length} failed:`,
          err,
        );
        throw err;
      }
      if ((i / CHUNK) % 5 === 0) {
        console.log(
          `[sync-bfe-static] progress ${inserted}/${rows.length}`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      upserted: inserted,
    });
  } catch (err) {
    // Details nur ins Server-Log — Fehlertexte (z. B. DB-Meldungen) nicht nach aussen geben.
    console.error("[sync-bfe-static] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        durationMs: Date.now() - started,
        error: "sync failed",
      },
      { status: 500 },
    );
  }
}
