"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onInstall: () => void;
};

const STEPS: Array<{ title: string; desc: string }> = [
  {
    title: "Suchen",
    desc: "Ort oder Adresse eingeben — die Karte springt hin.",
  },
  {
    title: "Filtern",
    desc: "Nach AC/DC, Leistung (kW) und Stecker-Typ eingrenzen.",
  },
  {
    title: "Säule antippen",
    desc: "Verfügbarkeit, Stecker, Tarife und Navigation im Detail.",
  },
  {
    title: "Favoriten",
    desc: "Säulen merken und mit „nur Favoriten“ schnell wiederfinden.",
  },
];

export function GuideModal({ open, onClose, onInstall }: Props) {
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
      aria-label="Kurzanleitung"
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
              Ladestation Schweiz
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Kurzanleitung — in 4 Schritten zur passenden Ladesäule.
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

        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span
                className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              >
                {i + 1}.
              </span>
              <div className="text-sm">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {s.title}
                </div>
                <div className="text-zinc-600 dark:text-zinc-400">{s.desc}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
          <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Diese App aufs Handy?
          </div>
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
            Direkt auf den Home-Bildschirm — kein App-Store, keine Werbung.
          </p>
          <button
            type="button"
            onClick={onInstall}
            className="mt-2 w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Als App speichern
          </button>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Los geht’s
          </button>
        </div>
      </div>
    </div>
  );
}
