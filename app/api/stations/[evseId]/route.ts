import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { stations } from "@/lib/db/schema";
import type { StationDetail, StationPoint } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evseId: string }> },
) {
  const { evseId } = await params;
  const id = decodeURIComponent(evseId);

  // Header-Infos vom geklickten Ladepunkt (Standort-gemeinsame Felder)
  const [head] = await db
    .select({
      evseId: stations.evseId,
      operatorName: stations.operatorName,
      lat: stations.lat,
      lon: stations.lon,
      city: stations.city,
      postalCode: stations.postalCode,
      street: stations.street,
      nameDe: stations.nameDe,
      nameFr: stations.nameFr,
      nameEn: stations.nameEn,
      authModes: stations.authModes,
      accessibility: stations.accessibility,
      renewableEnergy: stations.renewableEnergy,
      isOpen24h: stations.isOpen24h,
      hotline: stations.hotline,
    })
    .from(stations)
    .where(eq(stations.evseId, id))
    .limit(1);

  if (!head) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Alle Ladepunkte am selben Standort (gleicher Gruppierungsschlüssel)
  const pointRows = (await db.execute(sql`
    WITH target AS (
      SELECT CASE
        WHEN charging_station_id <> evse_id THEN charging_station_id
        ELSE round(lat::numeric, 5)::text || ',' || round(lon::numeric, 5)::text
      END AS k
      FROM stations WHERE evse_id = ${id}
    )
    SELECT s.evse_id, s.max_power_kw, s.is_ac, s.is_dc, s.plugs, st.status
    FROM stations s
    LEFT JOIN station_status st ON st.evse_id = s.evse_id
    WHERE (CASE
        WHEN s.charging_station_id <> s.evse_id THEN s.charging_station_id
        ELSE round(s.lat::numeric, 5)::text || ',' || round(s.lon::numeric, 5)::text
      END) = (SELECT k FROM target)
    ORDER BY s.max_power_kw DESC NULLS LAST
  `)) as unknown as Array<Record<string, unknown>>;

  const points: StationPoint[] = pointRows.map((r) => ({
    evseId: String(r.evse_id),
    maxPowerKw: r.max_power_kw != null ? Number(r.max_power_kw) : null,
    isAc: Boolean(r.is_ac),
    isDc: Boolean(r.is_dc),
    plugs: (r.plugs as string[] | null) ?? [],
    status: (r.status as string | null) ?? null,
  }));

  const total = points.length;
  const available = points.filter((p) => p.status === "Available").length;
  const hasStatus = points.some((p) => p.status != null);

  const detail: StationDetail = {
    evseId: head.evseId,
    name: head.nameDe ?? head.nameFr ?? head.nameEn ?? null,
    operatorName: head.operatorName,
    lat: head.lat,
    lon: head.lon,
    city: head.city,
    postalCode: head.postalCode,
    street: head.street,
    authModes: head.authModes,
    accessibility: head.accessibility,
    renewableEnergy: head.renewableEnergy,
    isOpen24h: head.isOpen24h,
    hotline: head.hotline,
    total,
    available,
    hasStatus,
    points,
  };

  return NextResponse.json(detail);
}
