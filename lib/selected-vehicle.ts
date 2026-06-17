"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ladestation-vehicle";
const EVENT_NAME = "ladestation-vehicle-changed";

function readStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Merkt die gewählte Fahrzeug-ID in localStorage (gemustert nach
 * {@link useFavorites}). Cross-Tab-Sync über ein CustomEvent.
 */
export function useSelectedVehicleId(): {
  vehicleId: string | null;
  setVehicleId: (id: string) => void;
} {
  const [vehicleId, setId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setId(readStorage());
    const t = setTimeout(refresh, 0);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  return {
    vehicleId,
    setVehicleId: (id: string) => {
      setId(id);
      writeStorage(id);
    },
  };
}
