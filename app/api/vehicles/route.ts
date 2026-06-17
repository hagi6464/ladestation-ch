import { NextResponse } from "next/server";
import type { Vehicle } from "@/lib/vehicle";
import vehiclesData from "@/data/ev-data.json";

/**
 * Liefert den kuratierten Fahrzeug-Datensatz (open-ev-data, gebündelt in
 * data/ev-data.json) für den Reiseplaner-Picker. Quelle bleibt baked-in; diese
 * Route hält die ~80 Einträge nur aus dem Client-JS-Bundle heraus.
 */
const vehicles = vehiclesData as Vehicle[];

export function GET() {
  return NextResponse.json(vehicles, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
