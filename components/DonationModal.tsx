"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Gehostete Payrexx-Spendenseite (öffentliche URL, kein Secret).
// TODO: Platzhalter durch den echten Payrexx-Spendenlink ersetzen.
const DONATION_URL = "https://PLATZHALTER.payrexx.com/de/pay";
const isPlaceholder = DONATION_URL.includes("PLATZHALTER");

export function DonationModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diese App unterstützen"
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
              Diese App unterstützen
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Gratis, werbefrei, ein privates Hobby-Projekt.
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

        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          Wenn dir die Ladestation-Karte hilft, freue ich mich über eine kleine,
          freiwillige Spende — bezahlbar mit TWINT oder Karte. Vielen Dank! 🔌
        </p>

        {isPlaceholder ? (
          <div className="mt-4 rounded-md bg-zinc-100 px-4 py-2.5 text-center text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Spendenlink wird in Kürze aktiviert.
          </div>
        ) : (
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            ❤️ Spenden via TWINT oder Karte
          </a>
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
}
