import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stations, stationStatus } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evseId: string }> },
) {
  const { evseId } = await params;
  const id = decodeURIComponent(evseId);

  const [row] = await db
    .select({
      evseId: stations.evseId,
      operatorName: stations.operatorName,
      chargingStationId: stations.chargingStationId,
      lat: stations.lat,
      lon: stations.lon,
      city: stations.city,
      postalCode: stations.postalCode,
      street: stations.street,
      nameDe: stations.nameDe,
      nameFr: stations.nameFr,
      nameEn: stations.nameEn,
      plugs: stations.plugs,
      authModes: stations.authModes,
      maxPowerKw: stations.maxPowerKw,
      isAc: stations.isAc,
      isDc: stations.isDc,
      isOpen24h: stations.isOpen24h,
      accessibility: stations.accessibility,
      renewableEnergy: stations.renewableEnergy,
      hotline: stations.hotline,
      status: stationStatus.status,
      statusFetchedAt: stationStatus.fetchedAt,
    })
    .from(stations)
    .leftJoin(stationStatus, eq(stations.evseId, stationStatus.evseId))
    .where(eq(stations.evseId, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}
