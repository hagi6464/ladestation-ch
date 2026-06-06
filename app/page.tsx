"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/components/Map";
import { FilterBar } from "@/components/FilterBar";
import { StationSheet } from "@/components/StationSheet";
import { SearchBox, type FlyTarget } from "@/components/SearchBox";
import { InstallModal } from "@/components/InstallModal";
import { GuideModal } from "@/components/GuideModal";
import { DonationModal } from "@/components/DonationModal";
import { LogoMenu } from "@/components/LogoMenu";
import { TripPlanner, type TripDestination } from "@/components/TripPlanner";
import { useFavorites } from "@/lib/favorites";
import { haversineKm, distanceToRouteKm, pointAtKm } from "@/lib/geo";
import { MODEL_Y, estimateRangeKm } from "@/lib/vehicle";
import type {
  Filters,
  StationFeatureCollection,
  TripRoute,
  CorridorStation,
} from "@/lib/types";

type Bbox = [number, number, number, number];

// Maximaler Luftlinien-Abstand einer Säule zur Route, um als Korridor-Stopp zu gelten.
const CORRIDOR_KM = 4;

async function fetchStations(
  bbox: Bbox,
  filters: Filters,
): Promise<StationFeatureCollection> {
  const params = new URLSearchParams({
    bbox: bbox.map((n) => n.toFixed(5)).join(","),
    current: filters.current,
  });
  if (filters.minPower > 0) params.set("minPower", String(filters.minPower));
  if (filters.plugType !== "any") params.set("plugType", filters.plugType);
  const res = await fetch(`/api/stations?${params}`);
  if (!res.ok) throw new Error(`stations failed: ${res.status}`);
  return res.json();
}

async function fetchRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<TripRoute> {
  const res = await fetch(
    `/api/route?from=${from.lat},${from.lon}&to=${to.lat},${to.lon}`,
  );
  if (!res.ok) {
    let message = "Route konnte nicht berechnet werden.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // kein JSON-Body — Standardmeldung behalten
    }
    throw new Error(message);
  }
  return res.json();
}

async function fetchCorridorStations(
  bbox: Bbox,
): Promise<StationFeatureCollection> {
  // CCS-DC-Schnelllader (Model-Y-Stecker) — hält das Set klein, kein Tiling nötig.
  const params = new URLSearchParams({
    bbox: bbox.map((n) => n.toFixed(5)).join(","),
    current: "dc",
    plugType: "ccs",
  });
  const res = await fetch(`/api/stations?${params}`);
  if (!res.ok) throw new Error(`corridor failed: ${res.status}`);
  return res.json();
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Page() {
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [filters, setFilters] = useState<Filters>({
    minPower: 0,
    current: "any",
    plugType: "any",
    favoritesOnly: false,
    rangeKm: 0,
  });
  const { ids: favoriteIds } = useFavorites();
  const [selectedEvseId, setSelectedEvseId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
  } | null>(null);

  // Reiseplaner-State
  const [tripOpen, setTripOpen] = useState(false);
  const [tripDestination, setTripDestination] =
    useState<TripDestination | null>(null);
  const [soc, setSoc] = useState(80);
  const [consumption, setConsumption] = useState(MODEL_Y.consumptionKwh100);
  const [bufferKm, setBufferKm] = useState(20);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);

  // Anleitung beim allerersten Besuch einmalig automatisch zeigen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Bei einem Deep-Link (geteilte Säule) keine Anleitung — Fokus ist die Säule.
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("fly") || sp.has("open")) return;
    if (window.localStorage.getItem("ladestation-guide-seen")) return;
    const t = setTimeout(() => {
      setGuideOpen(true);
      window.localStorage.setItem("ladestation-guide-seen", "1");
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // Deep-Link verarbeiten: ?fly=lat,lon&open=evseId → hinfliegen + Säule öffnen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fly = params.get("fly");
    const open = params.get("open");
    if (!fly && !open) return;
    // URL säubern, damit Reload den Deep-Link nicht erneut auslöst.
    window.history.replaceState(null, "", window.location.pathname);
    // Nach dem Mount anwenden, damit die Karte bereit ist.
    const t = setTimeout(() => {
      if (fly) {
        const [latStr, lonStr] = fly.split(",");
        const lat = Number(latStr);
        const lon = Number(lonStr);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setFlyTarget({ lat, lon, zoom: 15 });
        }
      }
      if (open) setSelectedEvseId(decodeURIComponent(open));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const debouncedBbox = useDebounced(bbox, 350);

  const { minPower, current, plugType } = filters;
  const queryKey = useMemo(
    () => ["stations", debouncedBbox, minPower, current, plugType] as const,
    [debouncedBbox, minPower, current, plugType],
  );

  const { data: rawData } = useQuery({
    queryKey,
    queryFn: () => fetchStations(debouncedBbox!, filters),
    enabled: !!debouncedBbox,
    placeholderData: (prev) => prev,
  });

  const data = useMemo<StationFeatureCollection | undefined>(() => {
    if (!rawData) return rawData;
    let features = rawData.features;
    if (filters.favoritesOnly) {
      features = features.filter((f) => favoriteIds.has(f.properties.evseId));
    }
    if (filters.rangeKm > 0 && userLocation) {
      features = features.map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        const inRange =
          haversineKm(userLocation.lat, userLocation.lon, lat, lon) <=
          filters.rangeKm;
        return { ...f, properties: { ...f.properties, inRange } };
      });
    }
    if (features === rawData.features) return rawData;
    return { ...rawData, features };
  }, [
    rawData,
    filters.favoritesOnly,
    filters.rangeKm,
    favoriteIds,
    userLocation,
  ]);

  // ---- Reiseplaner ------------------------------------------------------
  // Fahrzeug-Reichweite aus Ladezustand/Verbrauch (Model-Y-Referenz).
  const tripRangeKm = estimateRangeKm(soc, consumption, MODEL_Y.usableKwh);

  // Fahrroute (OpenRouteService via /api/route) — Start = GPS, Ziel = Geocode.
  const routeQuery = useQuery<TripRoute, Error>({
    queryKey: [
      "route",
      userLocation?.lat,
      userLocation?.lon,
      tripDestination?.lat,
      tripDestination?.lon,
    ],
    queryFn: () => fetchRoute(userLocation!, tripDestination!),
    enabled: !!userLocation && !!tripDestination,
    staleTime: 5 * 60_000,
  });
  const tripRoute = routeQuery.data ?? null;

  // Bounding-Box der Route (für Korridor-Fetch + Auto-Zoom).
  const routeBbox = useMemo<Bbox | null>(() => {
    if (!tripRoute) return null;
    let w = Infinity,
      s = Infinity,
      e = -Infinity,
      n = -Infinity;
    for (const [lon, lat] of tripRoute.geometry.coordinates) {
      if (lon < w) w = lon;
      if (lon > e) e = lon;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
    const padLon = (e - w) * 0.05 || 0.05;
    const padLat = (n - s) * 0.05 || 0.05;
    return [w - padLon, s - padLat, e + padLon, n + padLat];
  }, [tripRoute]);

  // CCS-DC-Säulen im Routen-bbox (eigener Fetch, unabhängig vom Karten-bbox).
  const corridorQuery = useQuery<StationFeatureCollection, Error>({
    queryKey: ["corridor", routeBbox],
    queryFn: () => fetchCorridorStations(routeBbox!),
    enabled: !!routeBbox,
    staleTime: 60_000,
  });

  // Auf den Korridor filtern (≤ CORRIDOR_KM zur Route) + alongKm/reachable annotieren.
  const corridorStops = useMemo<CorridorStation[]>(() => {
    if (!tripRoute || !corridorQuery.data) return [];
    const line = tripRoute.geometry.coordinates;
    const reach = tripRangeKm - bufferKm;
    const out: CorridorStation[] = [];
    for (const f of corridorQuery.data.features) {
      const [lon, lat] = f.geometry.coordinates;
      const { km, alongKm } = distanceToRouteKm(lat, lon, line);
      if (km > CORRIDOR_KM) continue;
      out.push({ ...f, alongKm, detourKm: km, reachable: alongKm <= reach });
    }
    out.sort((a, b) => a.alongKm - b.alongKm);
    return out;
  }, [tripRoute, corridorQuery.data, tripRangeKm, bufferKm]);

  // „ab hier laden"-Punkt entlang der Route (Reichweite minus Puffer).
  const chargeFromPoint = useMemo<[number, number] | null>(() => {
    if (!tripRoute) return null;
    const reach = tripRangeKm - bufferKm;
    if (reach <= 0 || reach >= tripRoute.distanceKm) return null;
    return pointAtKm(tripRoute.geometry.coordinates, reach);
  }, [tripRoute, tripRangeKm, bufferKm]);

  const tripActive = tripOpen && !!tripRoute;

  // Im Planer-Modus zeigt die Karte die Korridor-Säulen (grau = ausserhalb Reichweite).
  const mapData = useMemo<StationFeatureCollection | undefined>(() => {
    if (!tripActive) return data;
    return {
      type: "FeatureCollection",
      truncated: false,
      features: corridorStops.map((cs) => ({
        type: "Feature" as const,
        geometry: cs.geometry,
        properties: { ...cs.properties, inRange: cs.reachable },
      })),
    };
  }, [tripActive, data, corridorStops]);

  const toggleStop = (id: string) =>
    setSelectedStopIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handlePlan = (dest: TripDestination) => {
    setSelectedEvseId(null);
    setTripDestination(dest);
    setSelectedStopIds([]);
  };

  const handleClearTrip = () => {
    setTripDestination(null);
    setSelectedStopIds([]);
  };

  // Route inkl. gewählter Ladestopps an Google Maps übergeben (max. 3 mobil).
  const handleOpenInMaps = () => {
    if (!userLocation || !tripDestination) return;
    const chosen = corridorStops
      .filter((cs) => selectedStopIds.includes(cs.properties.evseId))
      .sort((a, b) => a.alongKm - b.alongKm)
      .slice(0, 3)
      .map((cs) => {
        const [lon, lat] = cs.geometry.coordinates;
        return `${lat},${lon}`;
      });
    const origin = encodeURIComponent(
      `${userLocation.lat},${userLocation.lon}`,
    );
    const destination = encodeURIComponent(
      `${tripDestination.lat},${tripDestination.lon}`,
    );
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (chosen.length > 0) {
      url += `&waypoints=${encodeURIComponent(chosen.join("|"))}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Apple Karten kann per URL nur ein Ziel — daher der nächste gewählte
  // Ladestopp (oder das Ziel, falls keiner gewählt).
  const handleOpenInApple = () => {
    if (!userLocation || !tripDestination) return;
    const next = corridorStops
      .filter((cs) => selectedStopIds.includes(cs.properties.evseId))
      .sort((a, b) => a.alongKm - b.alongKm)[0];
    const target = next
      ? { lat: next.geometry.coordinates[1], lon: next.geometry.coordinates[0] }
      : { lat: tripDestination.lat, lon: tripDestination.lon };
    const saddr = encodeURIComponent(`${userLocation.lat},${userLocation.lon}`);
    const daddr = encodeURIComponent(`${target.lat},${target.lon}`);
    window.open(
      `https://maps.apple.com/?saddr=${saddr}&daddr=${daddr}&dirflg=d`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const lastBboxRef = useRef<Bbox | null>(null);
  const handleBboxChange = (next: Bbox) => {
    const prev = lastBboxRef.current;
    if (
      prev &&
      Math.abs(prev[0] - next[0]) < 1e-4 &&
      Math.abs(prev[1] - next[1]) < 1e-4 &&
      Math.abs(prev[2] - next[2]) < 1e-4 &&
      Math.abs(prev[3] - next[3]) < 1e-4
    ) {
      return;
    }
    lastBboxRef.current = next;
    setBbox(next);
  };

  return (
    <div className="relative h-full w-full">
      <Map
        data={mapData}
        flyTo={flyTarget}
        userLocation={userLocation}
        rangeKm={filters.rangeKm}
        route={tripActive ? (tripRoute?.geometry.coordinates ?? null) : null}
        chargeFromPoint={tripActive ? chargeFromPoint : null}
        fitBounds={tripActive ? routeBbox : null}
        onBboxChange={handleBboxChange}
        onSelect={setSelectedEvseId}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-start gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3">
        <LogoMenu
          onOpenGuide={() => setGuideOpen(true)}
          onOpenInstall={() => setInstallOpen(true)}
          onOpenDonate={() => setDonateOpen(true)}
          onOpenTrip={() => {
            setSelectedEvseId(null);
            setTripOpen(true);
          }}
        />
        <div className="pointer-events-auto w-full sm:w-auto">
          <SearchBox
            onLocate={(t) => setFlyTarget({ ...t })}
            onUserLocation={setUserLocation}
          />
        </div>
        <div className="pointer-events-auto">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            hasLocation={!!userLocation}
          />
        </div>
        {data?.truncated && (
          <div className="pointer-events-auto rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-800 shadow-md">
            Mehr Stationen verfügbar — zoom oder filter, um mehr zu sehen
          </div>
        )}
      </div>

      <StationSheet
        evseId={selectedEvseId}
        onClose={() => setSelectedEvseId(null)}
      />

      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
      />

      <GuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onInstall={() => {
          setGuideOpen(false);
          setInstallOpen(true);
        }}
      />

      <DonationModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
      />

      <TripPlanner
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        hasLocation={!!userLocation}
        vehicleName={MODEL_Y.name}
        soc={soc}
        onSocChange={setSoc}
        consumption={consumption}
        onConsumptionChange={setConsumption}
        bufferKm={bufferKm}
        onBufferChange={setBufferKm}
        rangeKm={tripRangeKm}
        onPlan={handlePlan}
        onClear={handleClearTrip}
        loading={!!tripDestination && routeQuery.isFetching}
        error={routeQuery.error ? routeQuery.error.message : null}
        route={tripRoute}
        stops={corridorStops}
        selectedStopIds={selectedStopIds}
        onToggleStop={toggleStop}
        onOpenInMaps={handleOpenInMaps}
        onOpenInApple={handleOpenInApple}
      />

      <Link
        href="/impressum"
        className="pointer-events-auto absolute bottom-1 left-1 z-20 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-zinc-600 backdrop-blur transition-colors hover:bg-white hover:text-zinc-900 dark:bg-zinc-900/70 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Impressum
      </Link>
    </div>
  );
}
