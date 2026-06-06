/**
 * Distanz zwischen zwei Koordinaten in Kilometern (Haversine-Formel).
 * Für den Reichweiten-Filter (Distanz Standort → Ladesäule) ausreichend genau.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Erdradius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Routen-Geometrie als Liste von [lon, lat]-Stützpunkten (GeoJSON-Reihenfolge). */
export type LineCoords = [number, number][];

/** Kumulierte Streckenlänge [km] je Stützpunkt (erstes Element = 0). */
export function cumulativeKm(line: LineCoords): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) {
    const [lon1, lat1] = line[i - 1];
    const [lon2, lat2] = line[i];
    out.push(out[i - 1] + haversineKm(lat1, lon1, lat2, lon2));
  }
  return out;
}

/** Position [lon, lat] auf der Route nach `km` Fahrstrecke (für den Reichweiten-Marker). */
export function pointAtKm(line: LineCoords, km: number): [number, number] {
  if (line.length === 0) return [0, 0];
  if (km <= 0) return line[0];
  let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const [lon1, lat1] = line[i - 1];
    const [lon2, lat2] = line[i];
    const seg = haversineKm(lat1, lon1, lat2, lon2);
    if (acc + seg >= km) {
      const t = seg > 0 ? (km - acc) / seg : 0;
      return [lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t];
    }
    acc += seg;
  }
  return line[line.length - 1];
}

/**
 * Kürzester Abstand [km] eines Punkts zur Route plus seine Position `alongKm`
 * entlang der Route (am nächstgelegenen Streckenpunkt). Für den Korridor-Filter
 * und die Reihenfolge der Ladestopps.
 *
 * Lokale äquirektanguläre Näherung (Punkt-zu-Segment in km) — für den schmalen
 * Korridor (wenige km) genau genug.
 */
export function distanceToRouteKm(
  lat: number,
  lon: number,
  line: LineCoords,
): { km: number; alongKm: number } {
  let best = { km: Infinity, alongKm: 0 };
  let acc = 0;
  const kmPerDegLat = 110.574;
  const kmPerDegLon = 111.32 * Math.cos((lat * Math.PI) / 180);
  for (let i = 1; i < line.length; i++) {
    const [lon1, lat1] = line[i - 1];
    const [lon2, lat2] = line[i];
    const ax = (lon1 - lon) * kmPerDegLon;
    const ay = (lat1 - lat) * kmPerDegLat;
    const bx = (lon2 - lon) * kmPerDegLon;
    const by = (lat2 - lat) * kmPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const segLen2 = dx * dx + dy * dy;
    let t = segLen2 > 0 ? -(ax * dx + ay * dy) / segLen2 : 0;
    t = Math.max(0, Math.min(1, t));
    const dist = Math.hypot(ax + dx * t, ay + dy * t);
    const segKm = haversineKm(lat1, lon1, lat2, lon2);
    if (dist < best.km) best = { km: dist, alongKm: acc + t * segKm };
    acc += segKm;
  }
  return best;
}
