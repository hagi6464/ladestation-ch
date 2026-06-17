import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mapNinjaResults, type RawNinjaVehicle } from "@/lib/ev-ninjas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mindestens make ODER model muss gesetzt sein (API Ninjas erlaubt keine Gesamtliste).
const querySchema = z
  .object({
    make: z.string().trim().min(1).max(40).optional(),
    model: z.string().trim().min(1).max(60).optional(),
    year: z.coerce.number().int().min(1990).max(2100).optional(),
  })
  .refine((q) => q.make || q.model, {
    message: "make or model required",
  });

/**
 * Live-Proxy für die API Ninjas Electric Vehicle API. Hält den API-Key
 * server-seitig und mappt die Antwort auf unsere Vehicle-Form. Bewusst NICHT
 * serverseitig gecacht (Tarif-konform: Gratis/Developer erlaubt kein Speichern).
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Fahrzeugsuche ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const params = new URLSearchParams();
  if (parsed.data.make) params.set("make", parsed.data.make);
  if (parsed.data.model) params.set("model", parsed.data.model);
  if (parsed.data.year) {
    params.set("min_year", String(parsed.data.year));
    params.set("max_year", String(parsed.data.year));
  }

  let res: Response;
  try {
    res = await fetch(
      `https://api.api-ninjas.com/v1/electricvehicle?${params}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { "X-Api-Key": apiKey },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Fahrzeugdienst nicht erreichbar." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Fahrzeugsuche fehlgeschlagen (${res.status}).` },
      { status: 502 },
    );
  }

  const raw = (await res.json()) as RawNinjaVehicle[];
  const vehicles = Array.isArray(raw) ? mapNinjaResults(raw) : [];
  return NextResponse.json(vehicles);
}
