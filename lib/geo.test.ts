import { describe, expect, it } from "vitest";
import {
  cumulativeKm,
  distanceToRouteKm,
  haversineKm,
  pointAtKm,
  type LineCoords,
} from "./geo";

describe("haversineKm", () => {
  it("liefert 0 für identische Punkte", () => {
    expect(haversineKm(47.0, 8.0, 47.0, 8.0)).toBe(0);
  });

  it("Bern–Zürich ≈ 95 km (Luftlinie)", () => {
    const km = haversineKm(46.948, 7.4474, 47.3769, 8.5417);
    expect(km).toBeGreaterThan(93);
    expect(km).toBeLessThan(97);
  });

  it("1° Breitengrad am Äquator ≈ 111.2 km", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });

  it("ist symmetrisch", () => {
    const a = haversineKm(46.948, 7.4474, 47.3769, 8.5417);
    const b = haversineKm(47.3769, 8.5417, 46.948, 7.4474);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("cumulativeKm", () => {
  it("startet bei 0 und ist monoton steigend", () => {
    const line: LineCoords = [
      [8.0, 47.0],
      [8.0, 47.1],
      [8.1, 47.1],
    ];
    const cum = cumulativeKm(line);
    expect(cum).toHaveLength(3);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]);
  });

  it("Summe = Summe der Einzelsegmente", () => {
    const line: LineCoords = [
      [8.0, 47.0],
      [8.0, 47.1],
      [8.1, 47.1],
    ];
    const seg1 = haversineKm(47.0, 8.0, 47.1, 8.0);
    const seg2 = haversineKm(47.1, 8.0, 47.1, 8.1);
    expect(cumulativeKm(line)[2]).toBeCloseTo(seg1 + seg2, 10);
  });
});

describe("pointAtKm", () => {
  // Linie entlang des Äquators: Interpolation in lon ist dort linear in km.
  const line: LineCoords = [
    [0, 0],
    [1, 0],
  ];
  const total = haversineKm(0, 0, 0, 1); // ≈ 111.19 km

  it("km ≤ 0 → erster Punkt", () => {
    expect(pointAtKm(line, 0)).toEqual([0, 0]);
    expect(pointAtKm(line, -5)).toEqual([0, 0]);
  });

  it("km hinter dem Ende → letzter Punkt (Clamp)", () => {
    expect(pointAtKm(line, total + 50)).toEqual([1, 0]);
  });

  it("halbe Strecke → Mittelpunkt", () => {
    const [lon, lat] = pointAtKm(line, total / 2);
    expect(lon).toBeCloseTo(0.5, 2);
    expect(lat).toBe(0);
  });

  it("leere Linie → [0, 0]", () => {
    expect(pointAtKm([], 10)).toEqual([0, 0]);
  });
});

describe("distanceToRouteKm", () => {
  // Route Richtung Norden bei lon 8 (47.0 → 47.2): in Fahrtrichtung Nord ist
  // Osten (grössere lon) rechts — die in CH ohne Kreuzen anfahrbare Seite.
  const northRoute: LineCoords = [
    [8.0, 47.0],
    [8.0, 47.1],
    [8.0, 47.2],
  ];

  it("Punkt auf der Route → Abstand ≈ 0, alongKm = Strecke bis dorthin", () => {
    const r = distanceToRouteKm(47.1, 8.0, northRoute);
    expect(r.km).toBeCloseTo(0, 3);
    expect(r.alongKm).toBeCloseTo(haversineKm(47.0, 8.0, 47.1, 8.0), 2);
  });

  it("Station östlich der Nord-Route → side 'right'", () => {
    const r = distanceToRouteKm(47.1, 8.1, northRoute);
    expect(r.side).toBe("right");
  });

  it("Station westlich der Nord-Route → side 'left' (Gegenfahrbahn)", () => {
    const r = distanceToRouteKm(47.1, 7.9, northRoute);
    expect(r.side).toBe("left");
  });

  it("seitlicher Abstand: 0.1° lon bei 47° Breite ≈ 7.6 km", () => {
    const r = distanceToRouteKm(47.1, 8.1, northRoute);
    expect(r.km).toBeGreaterThan(7.4);
    expect(r.km).toBeLessThan(7.8);
  });

  it("Punkt vor dem Start → alongKm 0 (Clamp aufs erste Segment)", () => {
    const r = distanceToRouteKm(46.9, 8.0, northRoute);
    expect(r.alongKm).toBe(0);
  });
});
