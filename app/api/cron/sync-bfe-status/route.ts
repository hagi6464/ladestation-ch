import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { stationStatus } from "@/lib/db/schema";
import { extractStatus, fetchStatusData } from "@/lib/bfe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CHUNK = 1000;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const UPSERT_SET = {
  status: sql`excluded.status`,
  fetchedAt: sql`now()`,
};

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const payload = await fetchStatusData();
    const rows = extractStatus(payload);

    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      await db
        .insert(stationStatus)
        .values(batch)
        .onConflictDoUpdate({
          target: stationStatus.evseId,
          set: UPSERT_SET,
        });
      inserted += batch.length;
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - started,
      upserted: inserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-bfe-status] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        durationMs: Date.now() - started,
        error: message,
      },
      { status: 500 },
    );
  }
}
