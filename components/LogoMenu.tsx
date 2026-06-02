"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onOpenGuide: () => void;
  onOpenInstall: () => void;
};

export function LogoMenu({ onOpenGuide, onOpenInstall }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const choose = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Menü: Anleitung & App speichern"
        className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-md backdrop-blur transition-colors hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        ⚡ Ladestation Schweiz
        <span
          aria-hidden="true"
          className={`text-xs text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menü"
          className="absolute left-0 top-full z-30 mt-1 min-w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenGuide)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            📖 Kurzanleitung
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenInstall)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            📲 Als App speichern
          </button>
        </div>
      )}
    </div>
  );
}
