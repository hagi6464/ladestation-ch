import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ q: z.string().min(1).max(200) });

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    countrycode?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
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

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
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
      headers: {
        Accept: "application/json",
        "User-Agent": "ladestation-app/0.1 (Schweizer EV-Karte)",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `geocoder HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { features: PhotonFeature[] };

    const seen = new Set<string>();
    const results = data.features
      .filter((f) => f.properties.countrycode === "CH")
      .map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        const zoom =
          f.properties.housenumber || f.properties.street ? 16 : 13;
        return { label: buildLabel(f.properties), lat, lon, zoom };
      })
      .filter((r) => {
        if (r.label.length === 0 || seen.has(r.label)) return false;
        seen.add(r.label);
        return true;
      });

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
