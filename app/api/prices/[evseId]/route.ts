import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stations } from "@/lib/db/schema";
import { findCpoTariff, type CpoTariff } from "@/lib/cpo-tariffs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PriceResponse = {
  ok: true;
  station: {
    evseId: string;
    operatorName: string | null;
  };
  cpoStandardTariff: CpoTariff;
};

type ErrorResponse = {
  ok: false;
  reason: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evseId: string }> },
) {
  const { evseId: raw } = await params;
  const evseId = decodeURIComponent(raw);

  const [station] = await db
    .select({
      evseId: stations.evseId,
      operatorName: stations.operatorName,
    })
    .from(stations)
    .where(eq(stations.evseId, evseId))
    .limit(1);

  if (!station) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, reason: "station not found" },
      { status: 404 },
    );
  }

  const cpoTariff = findCpoTariff(station.operatorName);
  if (!cpoTariff) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, reason: "no published tariff data for this operator" },
      { status: 404 },
    );
  }

  return NextResponse.json<PriceResponse>(
    {
      ok: true,
      station: {
        evseId,
        operatorName: station.operatorName,
      },
      cpoStandardTariff: cpoTariff,
    },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
