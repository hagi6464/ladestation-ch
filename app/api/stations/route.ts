import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { PLUG_FILTER_NEEDLES } from "@/lib/plugs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FEATURES = 3000;

const querySchema = z.object({
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .transform(
      (s) => s.split(",").map(Number) as [number, number, number, number],
    ),
  minPower: z.coerce.number().min(0).max(1000).optional(),
  current: z.enum(["ac", "dc", "any"]).default("any"),
  plugType: z.enum(["any", "type2", "ccs", "chademo"]).default("any"),
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
    total: number;
    available: number;
    hasStatus: boolean;
  };
};

// Gruppierungsschlüssel: geteilte charging_station_id, sonst gerundete Koordinaten
const STATION_KEY = sql`CASE
  WHEN s.charging_station_id <> s.evse_id THEN s.charging_station_id
  ELSE round(s.lat::numeric, 5)::text || ',' || round(s.lon::numeric, 5)::text
END`;

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
  const { bbox, minPower, current, plugType } = parsed.data;
  const [west, south, east, north] = bbox;

  const filters = [
    sql`s.lat BETWEEN ${south} AND ${north}`,
    sql`s.lon BETWEEN ${west} AND ${east}`,
  ];
  if (minPower != null) filters.push(sql`s.max_power_kw >= ${minPower}`);
  if (current === "ac") filters.push(sql`s.is_ac = true`);
  if (current === "dc") filters.push(sql`s.is_dc = true`);
  if (plugType !== "any") {
    // Stecker-Namen sind Freitext (z.B. "CCS Combo 2 Plug") — daher Substring-
    // Matching pro Array-Element statt exaktem Array-Overlap.
    const likes = sql.join(
      PLUG_FILTER_NEEDLES[plugType].map((n) => sql`lower(p) LIKE ${`%${n}%`}`),
      sql` OR `,
    );
    filters.push(
      sql`EXISTS (SELECT 1 FROM unnest(s.plugs) AS p WHERE ${likes})`,
    );
  }
  const whereClause = sql.join(filters, sql` AND `);

  const rows = (await db.execute(sql`
    SELECT
      ${STATION_KEY} AS station_key,
      (array_agg(s.evse_id ORDER BY s.max_power_kw DESC NULLS LAST))[1] AS evse_id,
      avg(s.lat) AS lat,
      avg(s.lon) AS lon,
      (array_agg(COALESCE(s.name_de, s.name_en) ORDER BY s.max_power_kw DESC NULLS LAST))[1] AS name,
      (array_agg(s.operator_name ORDER BY s.max_power_kw DESC NULLS LAST))[1] AS operator_name,
      max(s.max_power_kw) AS max_power_kw,
      bool_or(s.is_ac) AS is_ac,
      bool_or(s.is_dc) AS is_dc,
      count(*)::int AS total,
      count(*) FILTER (WHERE st.status = 'Available')::int AS available,
      -- 'Unknown' = Betreiber liefert keine Live-Daten (z. B. Tesla) → zählt
      -- nicht als Status, sonst wirkt der Standort fälschlich komplett besetzt.
      count(st.status) FILTER (WHERE st.status <> 'Unknown')::int AS with_status
    FROM stations s
    LEFT JOIN station_status st ON st.evse_id = s.evse_id
    WHERE ${whereClause}
    GROUP BY station_key
    ORDER BY max(s.max_power_kw) DESC NULLS LAST
    LIMIT ${MAX_FEATURES}
  `)) as unknown as Array<Record<string, unknown>>;

  const features: Feature[] = rows.map((r) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [Number(r.lon), Number(r.lat)],
    },
    properties: {
      evseId: String(r.evse_id),
      name: (r.name as string | null) ?? null,
      operatorName: (r.operator_name as string | null) ?? null,
      maxPowerKw: r.max_power_kw != null ? Number(r.max_power_kw) : null,
      isAc: Boolean(r.is_ac),
      isDc: Boolean(r.is_dc),
      total: Number(r.total),
      available: Number(r.available),
      hasStatus: Number(r.with_status) > 0,
    },
  }));

  return NextResponse.json(
    {
      type: "FeatureCollection",
      features,
      truncated: rows.length === MAX_FEATURES,
    },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
