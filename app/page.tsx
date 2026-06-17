"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/components/Map";
import { FilterSheet, activeFilterCount } from "@/components/FilterSheet";
import { StationSheet } from "@/components/StationSheet";
import { SearchBox, type FlyTarget } from "@/components/SearchBox";
import { InstallModal } from "@/components/InstallModal";
import { GuideModal } from "@/components/GuideModal";
import { DonationModal } from "@/components/DonationModal";
import { LogoMenu } from "@/components/LogoMenu";
import { InfoCallout } from "@/components/ui/InfoCallout";
import {
  TripPlanner,
  type TripDestination,
  type ChargePref,
} from "@/components/TripPlanner";
import { useFavorites } from "@/lib/favorites";
import { useSelectedVehicleId } from "@/lib/selected-vehicle";
import { haversineKm, distanceToRouteKm, pointAtKm } from "@/lib/geo";
import {
  MODEL_Y,
  estimateRangeKm,
  chargeWindowKm,
  type Vehicle,
} from "@/lib/vehicle";
import { requestUserLocation } from "@/lib/geolocate";
import type {
  Filters,
  StationFeatureCollection,
  TripRoute,
  CorridorStation,
} from "@/lib/types";

type Bbox = [number, number, number, number];

// Maximaler Luftlinien-Abstand einer Säule zur Route, um als Korridor-Stopp zu gelten.
const CORRIDOR_KM = 4;

// Autobahn-Modus: praktisch kein Umweg (Raststätte / unmittelbar an Aus-/Einfahrt) und
// schnell. Die Route IST auf einer Autobahnfahrt die Autobahn → minimaler Umweg = an der
// Autobahn. Reiner Proxy aus den vorhandenen Daten (kein „Raststätte"-Feld im Datensatz).
const HIGHWAY_DETOUR_KM = 0.6;
const HIGHWAY_MIN_POWER_KW = 100;

// Karten-Zoom der Auto-Ortung beim Seitenstart: ~12 km Umkreis sichtbar.
// MapLibre-GL-Zoom (512er-Tiles): Zoom 10 ≈ ±10 km kurze / ±22 km lange
// Handy-Achse bei 47° N. Der Knopf bleibt näher dran.
const AUTO_LOCATE_ZOOM = 10;
const LOCATE_BUTTON_ZOOM = 14;

// Alle queryFns reichen das TanStack-`signal` an fetch durch — veraltete
// Requests (bbox-Wechsel, neues Ziel, geschlossenes Sheet) werden abgebrochen.
async function fetchStations(
  bbox: Bbox,
  filters: Filters,
  signal: AbortSignal,
): Promise<StationFeatureCollection> {
  const params = new URLSearchParams({
    bbox: bbox.map((n) => n.toFixed(5)).join(","),
    current: filters.current,
  });
  if (filters.minPower > 0) params.set("minPower", String(filters.minPower));
  if (filters.plugType !== "any") params.set("plugType", filters.plugType);
  const res = await fetch(`/api/stations?${params}`, { signal });
  if (!res.ok) throw new Error(`stations failed: ${res.status}`);
  return res.json();
}

async function fetchRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  signal: AbortSignal,
): Promise<TripRoute> {
  const res = await fetch(
    `/api/route?from=${from.lat},${from.lon}&to=${to.lat},${to.lon}`,
    { signal },
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
  plugType: string,
  signal: AbortSignal,
): Promise<StationFeatureCollection> {
  // DC-Schnelllader des gewählten Steckertyps — hält das Set klein, kein Tiling nötig.
  const params = new URLSearchParams({
    bbox: bbox.map((n) => n.toFixed(5)).join(","),
    current: "dc",
    plugType,
  });
  const res = await fetch(`/api/stations?${params}`, { signal });
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
  } | null>(null);

  // Reiseplaner-State
  const [tripOpen, setTripOpen] = useState(false);
  const [tripDestination, setTripDestination] =
    useState<TripDestination | null>(null);
  // Manueller Start (Eingabe wie Ziel); null = GPS-Standort verwenden.
  const [tripStart, setTripStart] = useState<TripDestination | null>(null);
  const [soc, setSoc] = useState(80);
  const [consumption, setConsumption] = useState(MODEL_Y.consumptionKwh100);
  // Gewünschter Ladestand bei Ankunft (%) — ersetzt den früheren km-Puffer.
  const [arrivalSoc, setArrivalSoc] = useState(25);
  // Standard an: auf Reisen sind Schnelllader ohne Umweg fast immer gewollt.
  const [highwayOnly, setHighwayOnly] = useState(true);
  const [chargePref, setChargePref] = useState<ChargePref>("middle");
  const { vehicleId: selectedVehicleId, setVehicleId } = useSelectedVehicleId();
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const appliedSuggestionRef = useRef<string | null>(null);
  // Standortabfrage — geteilt vom Suchfeld (Hauptschirm) und Reiseplaner-Startfeld.
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  // Per GPS erkannte Ortschaft — erscheint im Suchfeld und im Reiseplaner-Start
  // (nur Anzeige; Karte/Routing nutzen die exakten Koordinaten).
  const [locatedLabel, setLocatedLabel] = useState<string | null>(null);

  // GPS abfragen + Ortschaft auflösen — zentral für Seitenstart, Suchfeld-Knopf
  // und Reiseplaner-Startfeld. Fehler nur bei explizitem Klick zeigen.
  const locateUser = useCallback(
    (opts: { flyZoom?: number; showError: boolean }) => {
      setLocateError(null);
      setLocating(true);
      // Erst zurücksetzen, damit auch ein erneuter Klick am selben Ort die Felder neu füllt.
      setLocatedLabel(null);
      requestUserLocation()
        .then(async (loc) => {
          setUserLocation(loc);
          if (opts.flyZoom != null) {
            setFlyTarget({ lat: loc.lat, lon: loc.lon, zoom: opts.flyZoom });
          }
          // Ortschaft auflösen — best effort, Karte/Routing brauchen sie nicht.
          try {
            const res = await fetch(
              `/api/geocode?lat=${loc.lat}&lon=${loc.lon}`,
              { signal: AbortSignal.timeout(8000) },
            );
            if (res.ok) {
              const data = (await res.json()) as { place?: string | null };
              if (data.place) setLocatedLabel(data.place);
            }
          } catch {
            // Felder zeigen dann weiter ihren Platzhalter.
          }
        })
        .catch((e: unknown) => {
          if (opts.showError) {
            setLocateError(
              e instanceof Error
                ? e.message
                : "Standort konnte nicht ermittelt werden.",
            );
          }
        })
        .finally(() => setLocating(false));
    },
    [],
  );

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
  // Ohne Deep-Link: Standort automatisch bestimmen (Suchfeld + ~12-km-Umkreis).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fly = params.get("fly");
    const open = params.get("open");
    if (!fly && !open) {
      // Still: Verweigerung beim Seitenstart zeigt keinen Fehler (Knopf bleibt).
      const t = setTimeout(
        () => locateUser({ flyZoom: AUTO_LOCATE_ZOOM, showError: false }),
        0,
      );
      return () => clearTimeout(t);
    }
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
  }, [locateUser]);

  const debouncedBbox = useDebounced(bbox, 350);

  const { minPower, current, plugType } = filters;
  const queryKey = useMemo(
    () => ["stations", debouncedBbox, minPower, current, plugType] as const,
    [debouncedBbox, minPower, current, plugType],
  );

  const { data: rawData, isError: stationsError } = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchStations(debouncedBbox!, filters, signal),
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
  // Kuratierte Fahrzeugliste (open-ev-data, gebündelt) + Default Model Y voranstellen.
  const vehiclesQuery = useQuery<Vehicle[], Error>({
    queryKey: ["vehicles"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/vehicles", { signal });
      if (!res.ok) throw new Error("vehicles failed");
      return res.json();
    },
    staleTime: Infinity,
  });
  const vehicles = useMemo<Vehicle[]>(
    () => [MODEL_Y, ...(vehiclesQuery.data ?? [])],
    [vehiclesQuery.data],
  );
  const selectedVehicle = useMemo<Vehicle>(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? MODEL_Y,
    [vehicles, selectedVehicleId],
  );

  // Beim Fahrzeugwechsel den Verbrauch auf den Fahrzeug-Default setzen; innerhalb
  // desselben Fahrzeugs bleibt eine manuelle Anpassung erhalten (guarded Render-
  // Anpassung statt Effekt — wie die GPS-Ortschaft im Reiseplaner).
  const [prevVehicleId, setPrevVehicleId] = useState(selectedVehicle.id);
  if (selectedVehicle.id !== prevVehicleId) {
    setPrevVehicleId(selectedVehicle.id);
    setConsumption(selectedVehicle.consumptionKwh100);
  }

  // Fahrzeug-Reichweite aus Ladezustand/Verbrauch und Batterie des gewählten Autos.
  const tripRangeKm = estimateRangeKm(soc, consumption, selectedVehicle.usableKwh);
  // Reserve = Reichweite, die für den gewünschten Ankunfts-Ladestand nötig ist.
  const reserveKm = estimateRangeKm(
    arrivalSoc,
    consumption,
    selectedVehicle.usableKwh,
  );

  // Routen-Start: manuell eingegebener Start, sonst GPS-Standort.
  const routeFrom: { lat: number; lon: number } | null =
    tripStart ?? userLocation;

  // Fahrroute (OpenRouteService via /api/route) — Start = routeFrom, Ziel = Geocode.
  const routeQuery = useQuery<TripRoute, Error>({
    queryKey: [
      "route",
      routeFrom?.lat,
      routeFrom?.lon,
      tripDestination?.lat,
      tripDestination?.lon,
    ],
    queryFn: ({ signal }) => fetchRoute(routeFrom!, tripDestination!, signal),
    enabled: !!routeFrom && !!tripDestination,
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

  // DC-Säulen (Stecker des gewählten Autos) im Routen-bbox (eigener Fetch).
  const corridorQuery = useQuery<StationFeatureCollection, Error>({
    queryKey: ["corridor", routeBbox, selectedVehicle.plug],
    queryFn: ({ signal }) =>
      fetchCorridorStations(routeBbox!, selectedVehicle.plug, signal),
    enabled: !!routeBbox,
    staleTime: 60_000,
  });

  // Auf den Korridor filtern (≤ CORRIDOR_KM zur Route) + alongKm/reachable annotieren.
  // Autobahn-Modus: nur Säulen praktisch ohne Umweg und ≥ 100 kW.
  // Lade-Position: nur Säulen im Entfernungsfenster ab Start (relativ zur Reichweite).
  const corridorStops = useMemo<CorridorStation[]>(() => {
    if (!tripRoute || !corridorQuery.data) return [];
    const line = tripRoute.geometry.coordinates;
    // Lade-Abschnitt entlang der TATSÄCHLICHEN Fahrstrecke wählen, gedeckelt auf
    // die Reichweite: Bei kurzen Reisen (Strecke < Reichweite) liegen Anfang/Mitte/
    // Ende über der Route, sonst fielen Mitte/Ende hinter das Ziel = keine Säulen.
    const planLengthKm = Math.min(tripRangeKm, tripRoute.distanceKm);
    const [winLo, winHi] = chargeWindowKm(chargePref, planLengthKm);
    const out: CorridorStation[] = [];
    for (const f of corridorQuery.data.features) {
      const [lon, lat] = f.geometry.coordinates;
      const { km, alongKm, side } = distanceToRouteKm(lat, lon, line);
      if (km > CORRIDOR_KM) continue;
      if (highwayOnly) {
        const power = f.properties.maxPowerKw;
        if (km > HIGHWAY_DETOUR_KM) continue;
        if (power == null || power < HIGHWAY_MIN_POWER_KW) continue;
      }
      if (alongKm < winLo || alongKm > winHi) continue;
      // erreichbar = mit aktuellem Ladestand physisch anfahrbar (vor Reichweiten-Ende).
      out.push({
        ...f,
        alongKm,
        detourKm: km,
        side,
        reachable: alongKm <= tripRangeKm,
      });
    }
    out.sort((a, b) => a.alongKm - b.alongKm);
    return out;
  }, [tripRoute, corridorQuery.data, tripRangeKm, highwayOnly, chargePref]);

  // „ab hier laden"-Punkt entlang der Route (Reichweite minus Ankunfts-Reserve).
  const chargeFromPoint = useMemo<[number, number] | null>(() => {
    if (!tripRoute) return null;
    const reach = tripRangeKm - reserveKm;
    if (reach <= 0 || reach >= tripRoute.distanceKm) return null;
    return pointAtKm(tripRoute.geometry.coordinates, reach);
  }, [tripRoute, tripRangeKm, reserveKm]);

  // Empfehlung = stärkste Säule (dann kleinster Umweg) im gewählten Abschnitt.
  // Säulen auf der richtigen Fahrtseite (rechts) werden bevorzugt; nur wenn es dort
  // keine gibt, wird auf die Gegenfahrbahn zurückgegriffen.
  const suggestedStopId = useMemo<string | null>(() => {
    if (corridorStops.length === 0) return null;
    const byQuality = (a: CorridorStation, b: CorridorStation) => {
      const pa = a.properties.maxPowerKw ?? 0;
      const pb = b.properties.maxPowerKw ?? 0;
      if (pb !== pa) return pb - pa;
      return a.detourKm - b.detourKm;
    };
    const rightSide = corridorStops.filter((s) => s.side === "right");
    const pool = rightSide.length > 0 ? rightSide : corridorStops;
    return pool.slice().sort(byQuality)[0]?.properties.evseId ?? null;
  }, [corridorStops]);

  // Empfehlung einmalig als Vorauswahl übernehmen, wenn sie sich ändert (neue Route /
  // geänderte Vorliebe). Manuelle Auswahl danach bleibt unangetastet.
  useEffect(() => {
    if (suggestedStopId && suggestedStopId !== appliedSuggestionRef.current) {
      appliedSuggestionRef.current = suggestedStopId;
      setSelectedStopIds([suggestedStopId]);
    } else if (!suggestedStopId) {
      appliedSuggestionRef.current = null;
    }
  }, [suggestedStopId]);

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

  // Gewählte Ladestopps als [lon, lat] für den eigenen Karten-Marker.
  const selectedStopPoints = useMemo<[number, number][]>(
    () =>
      corridorStops
        .filter((cs) => selectedStopIds.includes(cs.properties.evseId))
        .map((cs) => cs.geometry.coordinates),
    [corridorStops, selectedStopIds],
  );

  const toggleStop = (id: string) =>
    setSelectedStopIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Reise-Modus: getippte Säule zusätzlich in den Plan aufnehmen …
  const handleTripAdd = (id: string) =>
    setSelectedStopIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  // … oder den zuletzt gewählten Ladestopp durch diese ersetzen.
  const handleTripReplace = (id: string) =>
    setSelectedStopIds((prev) => {
      const without = prev.filter((x) => x !== id);
      return without.length > 0 ? [...without.slice(0, -1), id] : [id];
    });

  // Im Reise-Modus auf eine Korridor-Säule getippt? → Detail-Sheet zeigt die
  // „zum Reiseplan?"-Nachfrage (zusätzlich / ersetzen).
  const tripPromptStop =
    tripActive &&
    selectedEvseId != null &&
    corridorStops.some((cs) => cs.properties.evseId === selectedEvseId);

  const handlePlan = (dest: TripDestination) => {
    setSelectedEvseId(null);
    setTripDestination(dest);
    setSelectedStopIds([]);
  };

  const handleClearTrip = () => {
    setTripDestination(null);
    setSelectedStopIds([]);
  };

  // „Mein Standort"-Knopf im Reiseplaner-Startfeld: manuellen Start verwerfen + GPS holen.
  const handleTripLocate = () => {
    setTripStart(null);
    locateUser({ showError: true });
  };

  // „Mein Standort"-Knopf im Suchfeld: hinfliegen (Nahansicht) + Felder füllen.
  const handleSearchLocate = () => {
    locateUser({ flyZoom: LOCATE_BUTTON_ZOOM, showError: true });
  };

  // Reiseplaner öffnen (Primär-Button) + Standort automatisch abfragen,
  // falls die Auto-Ortung beim Seitenstart nichts geliefert hat (z. B. verweigert).
  const openTrip = () => {
    setSelectedEvseId(null);
    setTripOpen(true);
    setLocateError(null);
    if (!userLocation && !tripStart) locateUser({ showError: false });
  };

  // Route inkl. gewählter Ladestopps an Google Maps übergeben (max. 3 mobil).
  const handleOpenInMaps = () => {
    if (!routeFrom || !tripDestination) return;
    const chosen = corridorStops
      .filter((cs) => selectedStopIds.includes(cs.properties.evseId))
      .sort((a, b) => a.alongKm - b.alongKm)
      .slice(0, 3)
      .map((cs) => {
        const [lon, lat] = cs.geometry.coordinates;
        return `${lat},${lon}`;
      });
    const origin = encodeURIComponent(`${routeFrom.lat},${routeFrom.lon}`);
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
    if (!routeFrom || !tripDestination) return;
    const next = corridorStops
      .filter((cs) => selectedStopIds.includes(cs.properties.evseId))
      .sort((a, b) => a.alongKm - b.alongKm)[0];
    const target = next
      ? { lat: next.geometry.coordinates[1], lon: next.geometry.coordinates[0] }
      : { lat: tripDestination.lat, lon: tripDestination.lon };
    const saddr = encodeURIComponent(`${routeFrom.lat},${routeFrom.lon}`);
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

  const filterCount = activeFilterCount(filters);

  return (
    <div className="relative h-full w-full">
      <Map
        data={mapData}
        flyTo={flyTarget}
        userLocation={userLocation}
        rangeKm={filters.rangeKm}
        route={tripActive ? (tripRoute?.geometry.coordinates ?? null) : null}
        chargeFromPoint={tripActive ? chargeFromPoint : null}
        selectedStops={tripActive ? selectedStopPoints : null}
        fitBounds={tripActive ? routeBbox : null}
        onBboxChange={handleBboxChange}
        onSelect={setSelectedEvseId}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-start gap-2 p-3 ${
          tripOpen ? "hidden" : ""
        }`}
      >
        <div className="flex w-full items-start gap-2 sm:w-auto">
          <LogoMenu
            onOpenFilter={() => setFilterOpen(true)}
            filterCount={filterCount}
            onOpenTrip={openTrip}
            onOpenGuide={() => setGuideOpen(true)}
            onOpenInstall={() => setInstallOpen(true)}
            onOpenDonate={() => setDonateOpen(true)}
          />
          <div className="pointer-events-auto min-w-0 flex-1 sm:w-80 sm:flex-none">
            <SearchBox
              onLocate={(t) => setFlyTarget({ ...t })}
              locatedLabel={locatedLabel}
              onLocateRequest={handleSearchLocate}
              locating={locating}
              locateError={locateError}
              hasFix={!!userLocation}
            />
          </div>
        </div>
        {stationsError && (
          <InfoCallout
            tone="danger"
            className="pointer-events-auto shadow-popover"
          >
            Stationen konnten nicht geladen werden — Verbindung prüfen.
          </InfoCallout>
        )}
        {data?.truncated && (
          <InfoCallout tone="warn" className="pointer-events-auto shadow-popover">
            Mehr Stationen verfügbar — zoom oder filter, um mehr zu sehen
          </InfoCallout>
        )}
      </div>

      <StationSheet
        evseId={selectedEvseId}
        onClose={() => setSelectedEvseId(null)}
        tripPrompt={tripPromptStop}
        onTripAdd={() => selectedEvseId && handleTripAdd(selectedEvseId)}
        onTripReplace={() => selectedEvseId && handleTripReplace(selectedEvseId)}
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

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        hasLocation={!!userLocation}
      />

      <TripPlanner
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        canPlan={!!routeFrom}
        onStartSelect={(s) => setTripStart(s)}
        onStartClear={() => setTripStart(null)}
        onLocateStart={handleTripLocate}
        locating={locating}
        locateError={locateError}
        locatedLabel={locatedLabel}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onVehicleChange={setVehicleId}
        soc={soc}
        onSocChange={setSoc}
        consumption={consumption}
        onConsumptionChange={setConsumption}
        arrivalSoc={arrivalSoc}
        onArrivalSocChange={setArrivalSoc}
        reserveKm={reserveKm}
        highwayOnly={highwayOnly}
        onHighwayOnlyChange={setHighwayOnly}
        chargePref={chargePref}
        onChargePrefChange={setChargePref}
        suggestedStopId={suggestedStopId}
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

    </div>
  );
}
