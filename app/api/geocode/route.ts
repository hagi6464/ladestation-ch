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
  };
};

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
  url.searchParams.set("limit", "10");
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
    const ch =
      data.features.find((f) => f.properties.countrycode === "CH") ??
      data.features[0];
    if (!ch) {
      return NextResponse.json(
        { result: null },
        { headers: { "Cache-Control": "public, max-age=3600" } },
      );
    }
    const [lon, lat] = ch.geometry.coordinates;
    const zoom =
      ch.properties.housenumber || ch.properties.street ? 16 : 13;
    return NextResponse.json(
      { result: { lat, lon, zoom } },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
