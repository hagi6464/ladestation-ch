import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Bearer-Auth für die Cron-Routen. Konstante Vergleichszeit (timingSafeEqual)
 * statt `===`, fehlgeschlagene Versuche werden geloggt.
 */
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  const ok =
    expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!ok) {
    console.warn(
      `[cron] unauthorized request: ${req.nextUrl.pathname} (ua: ${req.headers.get("user-agent") ?? "?"})`,
    );
  }
  return ok;
}
