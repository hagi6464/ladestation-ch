import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInServiceArea } from "@/lib/service-area";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vorwärts (q = Suchtext) oder rückwärts (lat/lon → Ortschaft, fürs Reiseplaner-Startfeld).
const querySchema = z.union([
  z.object({ q: z.string().min(1).max(200) }),
  z.object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
  }),
]);

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    countrycode?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    state?: string;
    osm_id?: number;
  };
};

function buildLabel(p: PhotonFeature["properties"]): string {
  const main =
    p.street && p.housenumber
      ? `${p.street} ${p.housenumber}`
      : (p.name ?? p.street ?? "");
  const locality = [p.postcode, p.city].filter(Boolean).join(" ");
  const parts = [main];
  if (locality && locality !== main) parts.push(locality);
  if (p.state && p.state !== main && p.state !== p.city) parts.push(p.state);
  return parts.filter(Boolean).join(", ");
}

/** Kompakte Ortschaft („PLZ Ort") für das Startfeld — kein voller Adress-String. */
function buildPlaceLabel(p: PhotonFeature["properties"]): string {
  const place = p.city ?? p.district ?? p.name ?? "";
  return [p.postcode, place].filter(Boolean).join(" ") || buildLabel(p);
}

const PHOTON_HEADERS = {
  Accept: "application/json",
  "User-Agent": "ladestation-app/0.1 (Schweizer EV-Karte)",
};

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  // Rückwärts: Koordinaten → Ortschaft (z. B. „2540 Grenchen").
  if ("lat" in parsed.data) {
    const { lat, lon } = parsed.data;
    const url = new URL("https://photon.komoot.io/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("lang", "de");
    url.searchParams.set("limit", "1");
    try {
      const res = await fetch(url.toString(), {
        headers: PHOTON_HEADERS,
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `geocoder HTTP ${res.status}` },
          { status: 502 },
        );
      }
      const data = (await res.json()) as { features: PhotonFeature[] };
      const place = data.features[0]
        ? buildPlaceLabel(data.features[0].properties)
        : null;
      return NextResponse.json(
        { place },
        { headers: { "Cache-Control": "public, max-age=3600" } },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  const { q } = parsed.data;

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "de");
  url.searchParams.set("lat", "46.8");
  url.searchParams.set("lon", "8.2");

  try {
    const res = await fetch(url.toString(), {
      headers: PHOTON_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `geocoder HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { features: PhotonFeature[] };

    const hadHits = data.features.length > 0;
    const seen = new Set<string>();
    const results = data.features
      .map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        const zoom =
          f.properties.housenumber || f.properties.street ? 16 : 13;
        return { label: buildLabel(f.properties), lat, lon, zoom };
      })
      .filter((r) => isInServiceArea(r.lat, r.lon))
      .filter((r) => {
        if (r.label.length === 0 || seen.has(r.label)) return false;
        seen.add(r.label);
        return true;
      });

    // Photon fand Orte, aber alle ausserhalb des abgedeckten Gebiets
    const outOfArea = hadHits && results.length === 0;

    return NextResponse.json(
      { results, outOfArea },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
