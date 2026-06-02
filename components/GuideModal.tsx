"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
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

export function GuideModal({ open, onClose }: Props) {
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

        <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <strong className="font-medium">Tipp:</strong> Über das Logo-Menü
          kannst du die App mit „Als App speichern“ auf den Home-Bildschirm legen.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Los geht’s
          </button>
        </div>
      </div>
    </div>
  );
}
