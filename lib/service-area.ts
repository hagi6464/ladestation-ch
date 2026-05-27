/**
 * Abgedecktes Gebiet: Schweiz + Liechtenstein + ~40 km Grenzzone zu DE/FR/IT/AT.
 *
 * Approximiert als Bounding Box um die CH/LI-Extrempunkte plus ~40 km Puffer
 * (0.36° lat, 0.53° lon). Rechteckig, daher an den Ecken etwas grosszügiger
 * als exakt 40 km Grenzdistanz — genügt aber, um Orte weit ausserhalb
 * (Berlin, Paris, München …) zuverlässig auszuschliessen.
 *
 * CH-Extrempunkte: lat 45.82–47.81, lon 5.96–10.49. LI liegt vollständig darin.
 */
export const SERVICE_AREA_BOUNDS = {
  latMin: 45.46,
  latMax: 48.17,
  lonMin: 5.43,
  lonMax: 11.02,
} as const;

export function isInServiceArea(lat: number, lon: number): boolean {
  return (
    lat >= SERVICE_AREA_BOUNDS.latMin &&
    lat <= SERVICE_AREA_BOUNDS.latMax &&
    lon >= SERVICE_AREA_BOUNDS.lonMin &&
    lon <= SERVICE_AREA_BOUNDS.lonMax
  );
}
