"use client";

import { useEffect, useState } from "react";
import { useInstall } from "@/lib/install";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InstallModal({ open, onClose }: Props) {
  const { canInstall, isIosSafari, isStandalone, install } = useInstall();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleInstall = async () => {
    setBusy(true);
    try {
      const result = await install();
      if (result === "accepted") onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Karte als App speichern"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="14,3 6,13 11,13 10,21 18,11 13,11" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Auf den Home-Bildschirm
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Karte direkt starten — ohne Adressleiste. Kein App-Store, keine
              Werbung.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {isStandalone ? (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            ✓ Bereits als App installiert — du nutzt gerade die Standalone-Ansicht.
          </div>
        ) : isIosSafari ? (
          <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
            <p>So fügst du die Karte im Safari hinzu:</p>
            <ol className="space-y-2 pl-5 [counter-reset:step] list-decimal">
              <li>
                Tippe unten auf das Teilen-Symbol{" "}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block align-text-bottom"
                  aria-hidden="true"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                .
              </li>
              <li>
                Wähle <strong>&laquo;Zum Home-Bildschirm&raquo;</strong>.
              </li>
              <li>Bestätige mit &laquo;Hinzufügen&raquo;.</li>
            </ol>
          </div>
        ) : canInstall ? (
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            <p>
              Dein Browser fügt die Karte mit einem Klick zum Home-Bildschirm
              hinzu — wie eine App.
            </p>
          </div>
        ) : (
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            <p>
              Dein Browser unterstützt die App-Verknüpfung nicht. Versuche es
              auf dem Handy mit Chrome (Android) oder Safari (iOS).
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Schliessen
          </button>
          {canInstall && !isStandalone && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={busy}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "…" : "Hinzufügen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
