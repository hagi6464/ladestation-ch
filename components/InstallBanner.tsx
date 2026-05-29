"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "ladestation-install-dismissed";

type Mode = "android" | "ios" | null;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari uses navigator.standalone
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  if (!isIos) return false;
  // iOS Chrome/Firefox use WebKit too — check for Safari-specific marker
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallBanner() {
  const [mode, setMode] = useState<Mode>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const t = setTimeout(() => {
      // Schon installiert?
      if (isStandalone()) return;
      // User hat bereits weggeklickt?
      if (window.localStorage.getItem(DISMISSED_KEY)) return;

      // iOS Safari: kein beforeinstallprompt-Event, Hinweis-Banner zeigen
      if (isIosSafari()) {
        setMode("ios");
        return;
      }

      // Android / Chromium: warte auf beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setMode("android");
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }, 1500); // kleine Verzögerung damit App erst lädt

    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    }
    setMode(null);
    setDeferredPrompt(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-label="App installieren"
      className="pointer-events-auto fixed inset-x-3 bottom-3 z-40 mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:right-3 sm:left-auto"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="14,3 6,13 11,13 10,21 18,11 13,11" />
          </svg>
        </div>
        <div className="flex-1 text-sm">
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
            Als App installieren
          </div>
          {mode === "android" ? (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Schneller Zugriff auf Karte und Favoriten — ohne Browser-Adressleiste.
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Im Safari unten auf Teilen{" "}
              <span aria-hidden="true">⤴</span> tippen, dann{" "}
              <strong>&laquo;Zum Home-Bildschirm&raquo;</strong>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hinweis schliessen"
          className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          ✕
        </button>
      </div>
      {mode === "android" && (
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Später
          </button>
          <button
            type="button"
            onClick={install}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
          >
            Installieren
          </button>
        </div>
      )}
    </div>
  );
}
