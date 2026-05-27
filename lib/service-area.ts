/**
 * Abgedecktes Gebiet: Schweiz + Liechtenstein + ~20 km Grenzzone zu DE/FR/IT/AT.
 *
 * Approximiert als Bounding Box um die CH/LI-Extrempunkte plus ~20 km Puffer
 * (0.18° lat, 0.27° lon). Rechteckig, daher an den Ecken etwas grosszügiger
 * als exakt 20 km Grenzdistanz — genügt aber, um Orte weit ausserhalb
 * (Berlin, Paris, Mailand …) zuverlässig auszuschliessen.
 *
 * CH-Extrempunkte: lat 45.82–47.81, lon 5.96–10.49. LI liegt vollständig darin.
 */
export const SERVICE_AREA_BOUNDS = {
  latMin: 45.64,
  latMax: 47.99,
  lonMin: 5.69,
  lonMax: 10.76,
} as const;

export function isInServiceArea(lat: number, lon: number): boolean {
  return (
    lat >= SERVICE_AREA_BOUNDS.latMin &&
    lat <= SERVICE_AREA_BOUNDS.latMax &&
    lon >= SERVICE_AREA_BOUNDS.lonMin &&
    lon <= SERVICE_AREA_BOUNDS.lonMax
  );
}
