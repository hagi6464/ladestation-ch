/**
 * Abgedecktes Gebiet, als Liste rechteckiger Bounding-Boxen (Geocode-/Routing-Gate).
 *
 * - CH: Schweiz + Liechtenstein + ~40 km Grenzzone zu DE/FR/IT/AT
 *   (CH-Extrempunkte lat 45.82–47.81, lon 5.96–10.49 + Puffer).
 * - AT: Österreich (Extrempunkte lat ~46.37–49.02, lon ~9.53–17.16 + kleiner Puffer)
 *   seit der E-Control-Integration.
 *
 * Rechteckig approximiert (an den Ecken etwas grosszügiger), genügt aber, um Orte
 * weit ausserhalb (Berlin, Paris, …) zuverlässig auszuschliessen.
 */
type Box = { latMin: number; latMax: number; lonMin: number; lonMax: number };

export const SERVICE_AREA_BOXES: readonly Box[] = [
  // CH/LI + Grenzzone
  { latMin: 45.46, latMax: 48.17, lonMin: 5.43, lonMax: 11.02 },
  // Österreich
  { latMin: 46.3, latMax: 49.1, lonMin: 9.4, lonMax: 17.2 },
] as const;

/** Rückwärtskompatibel: die erste (CH-)Box. */
export const SERVICE_AREA_BOUNDS = SERVICE_AREA_BOXES[0];

export function isInServiceArea(lat: number, lon: number): boolean {
  return SERVICE_AREA_BOXES.some(
    (b) =>
      lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax,
  );
}
