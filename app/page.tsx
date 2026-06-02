"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/components/Map";
import { FilterBar } from "@/components/FilterBar";
import { StationSheet } from "@/components/StationSheet";
import { SearchBox, type FlyTarget } from "@/components/SearchBox";
import { InstallModal } from "@/components/InstallModal";
import { useFavorites } from "@/lib/favorites";
import type { Filters, StationFeatureCollection } from "@/lib/types";

type Bbox = [number, number, number, number];

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
  });
  const { ids: favoriteIds } = useFavorites();
  const [selectedEvseId, setSelectedEvseId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [installOpen, setInstallOpen] = useState(false);

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
    if (!filters.favoritesOnly) return rawData;
    return {
      ...rawData,
      features: rawData.features.filter((f) =>
        favoriteIds.has(f.properties.evseId),
      ),
    };
  }, [rawData, filters.favoritesOnly, favoriteIds]);

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
        data={data}
        flyTo={flyTarget}
        onBboxChange={handleBboxChange}
        onSelect={setSelectedEvseId}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-start gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3">
        <button
          type="button"
          onClick={() => setInstallOpen(true)}
          title="Karte als App auf den Home-Bildschirm"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-md backdrop-blur transition-colors hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          ⚡ Ladestation Schweiz
        </button>
        <div className="pointer-events-auto w-full sm:w-auto">
          <SearchBox onLocate={(t) => setFlyTarget({ ...t })} />
        </div>
        <div className="pointer-events-auto">
          <FilterBar filters={filters} onChange={setFilters} />
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
    </div>
  );
}
