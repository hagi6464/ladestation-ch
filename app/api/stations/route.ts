import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { stations, stationStatus } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FEATURES = 3000;

const querySchema = z.object({
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .transform((s) => s.split(",").map(Number) as [number, number, number, number]),
  minPower: z.coerce.number().min(0).optional(),
  current: z.enum(["ac", "dc", "any"]).default("any"),
});

type Feature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    evseId: string;
    name: string | null;
    operatorName: string | null;
    maxPowerKw: number | null;
    isAc: boolean;
    isDc: boolean;
    status: string | null;
    plugs: string[];
  };
};

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { bbox, minPower, current } = parsed.data;
  const [west, south, east, north] = bbox;

  const conditions = [
    gte(stations.lat, south),
    lte(stations.lat, north),
    gte(stations.lon, west),
    lte(stations.lon, east),
  ];
  if (minPower != null) {
    conditions.push(gte(stations.maxPowerKw, minPower));
  }
  if (current === "ac") conditions.push(eq(stations.isAc, true));
  if (current === "dc") conditions.push(eq(stations.isDc, true));

  const rows = await db
    .select({
      evseId: stations.evseId,
      lat: stations.lat,
      lon: stations.lon,
      nameDe: stations.nameDe,
      nameEn: stations.nameEn,
      operatorName: stations.operatorName,
      maxPowerKw: stations.maxPowerKw,
      isAc: stations.isAc,
      isDc: stations.isDc,
      plugs: stations.plugs,
      status: stationStatus.status,
    })
    .from(stations)
    .leftJoin(stationStatus, eq(stations.evseId, stationStatus.evseId))
    .where(and(...conditions))
    .orderBy(sql`${stations.maxPowerKw} desc nulls last`)
    .limit(MAX_FEATURES);

  const features: Feature[] = rows.map((r) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [r.lon, r.lat] },
    properties: {
      evseId: r.evseId,
      name: r.nameDe ?? r.nameEn ?? null,
      operatorName: r.operatorName,
      maxPowerKw: r.maxPowerKw,
      isAc: r.isAc,
      isDc: r.isDc,
      status: r.status,
      plugs: r.plugs,
    },
  }));

  return NextResponse.json(
    { type: "FeatureCollection", features, truncated: rows.length === MAX_FEATURES },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
