"use client";

import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Module-level state — der beforeinstallprompt-Event feuert einmal pro
// Page-Load und muss gefangen werden bevor irgendeine Komponente mountet.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify(): void {
  version++;
  listeners.forEach((cb) => cb());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): number {
  return version;
}

function getServerSnapshot(): number {
  return 0;
}

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function readIosSafari(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  if (!isIos) return false;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export type InstallState = {
  canInstall: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export function useInstall(): InstallState {
  // useSyncExternalStore triggert re-render wenn module-state sich ändert
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    canInstall: deferredPrompt !== null,
    isStandalone: readStandalone(),
    isIosSafari: readIosSafari(),
    install: async () => {
      if (!deferredPrompt) return "unavailable";
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        notify();
      }
      return choice.outcome;
    },
  };
}
