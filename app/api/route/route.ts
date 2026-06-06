import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInServiceArea } from "@/lib/service-area";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "lat,lon" — gleiche Koordinaten-Schreibweise wie im Deep-Link (?fly=lat,lon).
const COORD = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const querySchema = z.object({
  from: z.string().regex(COORD),
  to: z.string().regex(COORD),
});

type OrsDirections = {
  features?: Array<{
    geometry: { type: "LineString"; coordinates: [number, number][] };
    properties?: { summary?: { distance?: number; duration?: number } };
  }>;
};

/**
 * Routing-Proxy für den Reiseplaner. Holt die Fahrroute (Strassen-Geometrie +
 * Distanz/Dauer) von OpenRouteService. Der API-Key bleibt server-seitig.
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Routing ist nicht konfiguriert." },
      { status: 503 },
    );
  }

  const [fromLat, fromLon] = parsed.data.from.split(",").map(Number);
  const [toLat, toLon] = parsed.data.to.split(",").map(Number);

  // Nur innerhalb des abgedeckten Gebiets (CH/LI + Grenzzone) routen.
  if (!isInServiceArea(fromLat, fromLon) || !isInServiceArea(toLat, toLon)) {
    return NextResponse.json(
      {
        error:
          "Start oder Ziel liegt ausserhalb des abgedeckten Gebiets (Schweiz/Liechtenstein).",
      },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        // ORS erwartet [lon, lat].
        body: JSON.stringify({
          coordinates: [
            [fromLon, fromLat],
            [toLon, toLat],
          ],
        }),
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Routing-Dienst nicht erreichbar." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Routing fehlgeschlagen (${res.status}).` },
      { status: 502 },
    );
  }

  const json = (await res.json()) as OrsDirections;
  const feature = json.features?.[0];
  if (!feature) {
    return NextResponse.json(
      { error: "Keine Route gefunden." },
      { status: 404 },
    );
  }

  const summary = feature.properties?.summary ?? {};
  return NextResponse.json(
    {
      geometry: feature.geometry,
      distanceKm: (summary.distance ?? 0) / 1000,
      durationMin: (summary.duration ?? 0) / 60,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
