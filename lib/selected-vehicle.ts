"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ladestation-vehicle";
const EVENT_NAME = "ladestation-vehicle-changed";

/** Auswahl-Kennung — nur Identifikatoren, KEINE Spezifikationen (Tarif-konform). */
export type VehicleKey = { make: string; model: string; year?: number };

function readStorage(): VehicleKey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as VehicleKey).make === "string" &&
      typeof (parsed as VehicleKey).model === "string"
    ) {
      return parsed as VehicleKey;
    }
  } catch {
    // fall through
  }
  return null;
}

function writeStorage(key: VehicleKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(key));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Merkt die gewählte Fahrzeug-Kennung (Marke/Modell/Jahr) in localStorage. Die
 * Spezifikationen werden NICHT gespeichert, sondern bei Bedarf live neu geholt.
 * Cross-Tab-Sync über ein CustomEvent (gemustert nach useFavorites).
 */
export function useSelectedVehicleKey(): {
  vehicleKey: VehicleKey | null;
  setVehicleKey: (key: VehicleKey) => void;
} {
  const [vehicleKey, setKey] = useState<VehicleKey | null>(null);

  useEffect(() => {
    const refresh = () => setKey(readStorage());
    const t = setTimeout(refresh, 0);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  return {
    vehicleKey,
    setVehicleKey: (key: VehicleKey) => {
      setKey(key);
      writeStorage(key);
    },
  };
}
