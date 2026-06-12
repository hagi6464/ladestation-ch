"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  Map as MapInstance,
  type ExpressionSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationFeatureCollection } from "@/lib/types";
import type { LineCoords } from "@/lib/geo";
import type { FlyTarget } from "@/components/SearchBox";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const SOURCE_ID = "stations";
const USER_ACCURACY_ID = "user-accuracy";
const USER_RANGE_ID = "user-range";
const ROUTE_ID = "trip-route";

// Marker für gewählte/empfohlene Ladestopps im Reiseplaner — Abwandlung des
// App-Icons (Ladesäule + Schweizerkreuz) auf einem Emerald-Badge.
const SELECTED_STOP_MARKER_HTML = `
  <div class="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-white bg-emerald-600 shadow-lg">
    <svg width="20" height="20" viewBox="0 0 512 512" aria-hidden="true">
      <rect x="158" y="384" width="196" height="30" rx="12" fill="#ffffff"/>
      <rect x="178" y="104" width="156" height="288" rx="34" fill="#ffffff"/>
      <rect x="200" y="126" width="112" height="110" rx="20" fill="#DA291C"/>
      <rect x="245.5" y="146" width="21" height="70" fill="#ffffff"/>
      <rect x="221" y="170.5" width="70" height="21" fill="#ffffff"/>
      <polygon points="264,264 216,324 246,324 240,372 288,312 258,312" fill="#10b981"/>
    </svg>
  </div>`;

// Tesla-Standorte: weisses „T" im Marker (eigene Zeichnung, gleiche Optik wie
// das Tesla-Plug-Chip im Detail-Sheet). Tesla liefert keinen Live-Status — der
// Kreis bleibt grau und wäre sonst nicht von anderen „Status unbekannt"-Säulen
// unterscheidbar. 56 px + pixelRatio 4 → 14 px logisch, scharf auf Retina.
const TESLA_ICON_ID = "tesla-t";
const TESLA_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24">
    <path d="M 7 8 L 17 8 M 12 8.3 L 12 17" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
  </svg>`;

// Tesla-Erkennung über den Betreiber — geteilt von Kreis-Farbe und T-Symbol.
const IS_TESLA: ExpressionSpecification = [
  "in",
  "tesla",
  ["downcase", ["coalesce", ["get", "operatorName"], ""]],
];

// Tesla-Markerfarbe (orange-500) — bewusst eigenständig: kein Live-Status,
// aber als Supercharger-Standort auf einen Blick erkennbar.
const TESLA_COLOR = "#f97316";

type UserLocation = { lat: number; lon: number; accuracy: number };

/**
 * GeoJSON-Polygon, das einen Kreis mit `meters` Radius um den Punkt approximiert.
 * Als echte Geometrie (Meter) skaliert er korrekt mit dem Zoom — anders als ein
 * pixelbasierter circle-Radius.
 */
function accuracyCircle(
  lat: number,
  lon: number,
  meters: number,
  steps = 48,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earth = 6378137; // Erdradius in m
  const dLat = (meters / earth) * (180 / Math.PI);
  const dLon = dLat / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

type Props = {
  data: StationFeatureCollection | undefined;
  flyTo: FlyTarget | null;
  userLocation: UserLocation | null;
  rangeKm: number;
  /** Reiseplaner: Fahrroute als [lon, lat]-Stützpunkte (oder null). */
  route?: LineCoords | null;
  /** Reiseplaner: Punkt, ab dem nachgeladen werden sollte. */
  chargeFromPoint?: [number, number] | null;
  /** Reiseplaner: gewählte/empfohlene Ladestopps als [lon, lat] (eigenes Icon). */
  selectedStops?: [number, number][] | null;
  /** Reiseplaner: Kartenausschnitt auf [west, süd, ost, nord] zoomen. */
  fitBounds?: [number, number, number, number] | null;
  onBboxChange: (bbox: [number, number, number, number]) => void;
  onSelect: (evseId: string) => void;
};

export function Map({
  data,
  flyTo,
  userLocation,
  rangeKm,
  route,
  chargeFromPoint,
  selectedStops,
  fitBounds,
  onBboxChange,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const chargeMarkerRef = useRef<maplibregl.Marker | null>(null);
  const selectedMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onBboxRef = useRef(onBboxChange);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onBboxRef.current = onBboxChange;
    onSelectRef.current = onSelect;
  }, [onBboxChange, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [8.2275, 46.8182],
      zoom: 7.2,
      minZoom: 6,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    const emitBbox = () => {
      const b = map.getBounds();
      onBboxRef.current([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ]);
    };

    map.on("load", () => {
      // Genauigkeitskreis des Standorts — unter den Stationen, damit deren
      // Marker oben bleiben.
      map.addSource(USER_ACCURACY_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "user-accuracy-fill",
        type: "fill",
        source: USER_ACCURACY_ID,
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "user-accuracy-outline",
        type: "line",
        source: USER_ACCURACY_ID,
        paint: { "line-color": "#3b82f6", "line-opacity": 0.35, "line-width": 1 },
      });

      // Reichweiten-Kreis — gestrichelte Outline + sehr leichter Fill, unter den Stationen.
      map.addSource(USER_RANGE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "user-range-fill",
        type: "fill",
        source: USER_RANGE_ID,
        paint: { "fill-color": "#2563eb", "fill-opacity": 0.05 },
      });
      map.addLayer({
        id: "user-range-outline",
        type: "line",
        source: USER_RANGE_ID,
        paint: {
          "line-color": "#2563eb",
          "line-opacity": 0.5,
          "line-width": 1.5,
          "line-dasharray": [2, 2],
        },
      });

      // Reiseplaner-Route — kräftige Linie unter den Stationen.
      map.addSource(ROUTE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "trip-route-casing",
        type: "line",
        source: ROUTE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.8 },
      });
      map.addLayer({
        id: "trip-route-line",
        type: "line",
        source: ROUTE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.9 },
      });

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 13,
        // Reichweiten-Filter: je Cluster zählen, wie viele Punkte in- bzw.
        // ausserhalb der Reichweite liegen (inRange true/false; fehlt = Filter aus).
        clusterProperties: {
          inRangeCount: ["+", ["case", ["==", ["get", "inRange"], true], 1, 0]],
          outRangeCount: [
            "+",
            ["case", ["==", ["get", "inRange"], false], 1, 0],
          ],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "case",
            // Reichweiten-Filter: kein Punkt erreichbar → grau statt blau.
            [
              "all",
              ["==", ["get", "inRangeCount"], 0],
              [">", ["get", "outRangeCount"], 0],
            ],
            "#9ca3af",
            [
              "step",
              ["get", "point_count"],
              "#60a5fa",
              25,
              "#3b82f6",
              100,
              "#1d4ed8",
            ],
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            25,
            22,
            100,
            28,
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
          "circle-opacity": [
            "case",
            [
              "all",
              ["==", ["get", "inRangeCount"], 0],
              [">", ["get", "outRangeCount"], 0],
            ],
            0.7,
            1,
          ],
          "circle-stroke-opacity": [
            "case",
            [
              "all",
              ["==", ["get", "inRangeCount"], 0],
              [">", ["get", "outRangeCount"], 0],
            ],
            0.7,
            1,
          ],
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
          "text-font": ["Noto Sans Regular"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            // Reichweiten-Filter: ausserhalb → grau (überschreibt Verfügbarkeitsfarbe).
            ["==", ["get", "inRange"], false],
            "#9ca3af",
            [">=", ["get", "available"], 1],
            "#10b981",
            ["get", "hasStatus"],
            "#ef4444",
            // Tesla (kein Live-Status): orange statt grau, T-Symbol liegt darüber.
            IS_TESLA,
            TESLA_COLOR,
            "#64748b",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "maxPowerKw"],
            0,
            5,
            22,
            6,
            50,
            8,
            150,
            10,
          ],
          "circle-stroke-color": [
            "case",
            ["get", "isDc"],
            "#155e75",
            "#ffffff",
          ],
          "circle-stroke-width": [
            "case",
            ["get", "isDc"],
            2.5,
            1.5,
          ],
          // Reichweiten-Filter: Säulen ausserhalb (inRange === false) ausgrauen.
          "circle-opacity": [
            "case",
            ["==", ["get", "inRange"], false],
            0.7,
            1,
          ],
          "circle-stroke-opacity": [
            "case",
            ["==", ["get", "inRange"], false],
            0.7,
            1,
          ],
        },
      });

      // Tesla-„T" über den (grauen) Tesla-Markern. Bild lädt asynchron —
      // Layer erst im onload anlegen, sonst meldet MapLibre ein fehlendes Bild.
      const teslaImg = new Image(56, 56);
      teslaImg.onload = () => {
        if (!mapRef.current || map.hasImage(TESLA_ICON_ID)) return;
        map.addImage(TESLA_ICON_ID, teslaImg, { pixelRatio: 4 });
        map.addLayer({
          id: "unclustered-tesla",
          type: "symbol",
          source: SOURCE_ID,
          filter: ["all", ["!", ["has", "point_count"]], IS_TESLA],
          layout: {
            "icon-image": TESLA_ICON_ID,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
          paint: {
            // Reichweiten-Filter: wie der Kreis darunter leicht ausgrauen.
            "icon-opacity": [
              "case",
              ["==", ["get", "inRange"], false],
              0.7,
              1,
            ],
          },
        });
      };
      teslaImg.src =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(TESLA_ICON_SVG);

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        if (clusterId != null) {
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const feat = features[0];
            if (feat.geometry.type !== "Point") return;
            map.easeTo({
              center: feat.geometry.coordinates as [number, number],
              zoom,
            });
          });
        }
      });

      map.on("click", "unclustered", (e) => {
        const feat = e.features?.[0];
        const evseId = feat?.properties?.evseId;
        if (typeof evseId === "string") onSelectRef.current(evseId);
      });

      for (const layer of ["clusters", "unclustered"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      emitBbox();
    });

    map.on("moveend", emitBbox);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    const apply = () => {
      const src = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (src) src.setData(data);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.flyTo({
      center: [flyTo.lon, flyTo.lat],
      zoom: flyTo.zoom,
      speed: 1.6,
    });
  }, [flyTo]);

  // Standort: blauer Punkt (DOM-Marker) …
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.style.pointerEvents = "none";
      el.innerHTML = `
        <span class="block h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-md"></span>`;
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
    }
  }, [userLocation]);

  // … und transluzenter Genauigkeitskreis (Karten-Layer).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(USER_ACCURACY_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      src.setData(
        userLocation
          ? {
              type: "FeatureCollection",
              features: [
                accuracyCircle(
                  userLocation.lat,
                  userLocation.lon,
                  userLocation.accuracy,
                ),
              ],
            }
          : { type: "FeatureCollection", features: [] },
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [userLocation]);

  // Reichweiten-Kreis um den Standort (Radius = rangeKm).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(USER_RANGE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      src.setData(
        userLocation && rangeKm > 0
          ? {
              type: "FeatureCollection",
              features: [
                accuracyCircle(
                  userLocation.lat,
                  userLocation.lon,
                  rangeKm * 1000,
                ),
              ],
            }
          : { type: "FeatureCollection", features: [] },
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [userLocation, rangeKm]);

  // Reiseplaner: Route-Linie.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(ROUTE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      src.setData(
        route && route.length > 1
          ? {
              type: "Feature",
              geometry: { type: "LineString", coordinates: route },
              properties: {},
            }
          : { type: "FeatureCollection", features: [] },
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [route]);

  // Reiseplaner: „ab hier laden"-Marker (DOM-Marker, amber + Blitz).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!chargeFromPoint) {
      chargeMarkerRef.current?.remove();
      chargeMarkerRef.current = null;
      return;
    }
    if (!chargeMarkerRef.current) {
      const el = document.createElement("div");
      el.style.pointerEvents = "none";
      el.innerHTML = `
        <span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-500 shadow-md">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>
        </span>`;
      chargeMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(chargeFromPoint)
        .addTo(map);
    } else {
      chargeMarkerRef.current.setLngLat(chargeFromPoint);
    }
  }, [chargeFromPoint]);

  // Reiseplaner: gewählte/empfohlene Ladestopps mit eigenem Säulen-Icon markieren.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of selectedMarkersRef.current) m.remove();
    selectedMarkersRef.current = [];
    if (!selectedStops || selectedStops.length === 0) return;
    for (const point of selectedStops) {
      const el = document.createElement("div");
      el.style.pointerEvents = "none";
      el.innerHTML = SELECTED_STOP_MARKER_HTML;
      selectedMarkersRef.current.push(
        new maplibregl.Marker({ element: el }).setLngLat(point).addTo(map),
      );
    }
  }, [selectedStops]);

  // Reiseplaner: Kartenausschnitt auf die Route zoomen.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBounds) return;
    const [west, south, east, north] = fitBounds;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 60, duration: 800 },
    );
  }, [fitBounds]);

  return <div ref={containerRef} className="h-full w-full" />;
}
