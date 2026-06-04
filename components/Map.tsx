"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MapInstance } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationFeatureCollection } from "@/lib/types";
import type { FlyTarget } from "@/components/SearchBox";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const SOURCE_ID = "stations";
const USER_ACCURACY_ID = "user-accuracy";

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
  onBboxChange: (bbox: [number, number, number, number]) => void;
  onSelect: (evseId: string) => void;
};

export function Map({
  data,
  flyTo,
  userLocation,
  onBboxChange,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
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

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#60a5fa",
            25,
            "#3b82f6",
            100,
            "#1d4ed8",
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
            [">=", ["get", "available"], 1],
            "#10b981",
            ["get", "hasStatus"],
            "#ef4444",
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
        },
      });

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

  return <div ref={containerRef} className="h-full w-full" />;
}
