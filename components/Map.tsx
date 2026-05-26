"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MapInstance } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StationFeatureCollection } from "@/lib/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const SOURCE_ID = "stations";

type Props = {
  data: StationFeatureCollection | undefined;
  onBboxChange: (bbox: [number, number, number, number]) => void;
  onSelect: (evseId: string) => void;
};

export function Map({ data, onBboxChange, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
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

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "top-right",
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
            "match",
            ["get", "status"],
            "Available",
            "#10b981",
            "Occupied",
            "#ef4444",
            "Reserved",
            "#f59e0b",
            "OutOfService",
            "#94a3b8",
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

  return <div ref={containerRef} className="h-full w-full" />;
}
