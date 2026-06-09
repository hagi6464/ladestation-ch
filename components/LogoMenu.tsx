"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  onOpenGuide: () => void;
  onOpenInstall: () => void;
  onOpenDonate: () => void;
};

const ITEM_CLASS =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800";

export function LogoMenu({ onOpenGuide, onOpenInstall, onOpenDonate }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  // Native Teilen-Liste (WhatsApp/SMS/…) auf dem Handy, sonst Link kopieren.
  const handleShare = async () => {
    const url = window.location.origin;
    const shareData = {
      title: "Ladestation Schweiz",
      text: "Alle öffentlichen Ladesäulen der Schweiz mit Preisvergleich:",
      url,
    };
    if (navigator.share) {
      setOpen(false);
      try {
        await navigator.share(shareData);
      } catch {
        // Teilen abgebrochen oder fehlgeschlagen — bewusst ignorieren
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menü"
        title="Menü"
        className="inline-flex items-center gap-1 rounded-xl bg-white/95 p-1.5 pr-2 shadow-md backdrop-blur transition-colors hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-900"
      >
        {/* App-Logo: Ladesäule + Schweizerkreuz */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 512 512"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect width="512" height="512" rx="96" fill="#10b981" />
          <rect x="158" y="384" width="196" height="30" rx="12" fill="#ffffff" />
          <rect x="178" y="104" width="156" height="288" rx="34" fill="#ffffff" />
          <rect x="200" y="126" width="112" height="110" rx="20" fill="#DA291C" />
          <rect x="245.5" y="146" width="21" height="70" fill="#ffffff" />
          <rect x="221" y="170.5" width="70" height="21" fill="#ffffff" />
          <polygon
            points="264,264 216,324 246,324 240,372 288,312 258,312"
            fill="#10b981"
          />
        </svg>
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
          <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Ladestation Schweiz
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenGuide)}
            className={ITEM_CLASS}
          >
            📖 Kurzanleitung
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenInstall)}
            className={ITEM_CLASS}
          >
            📲 Als App speichern
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleShare}
            className={ITEM_CLASS}
          >
            {copied ? "✓ Link kopiert" : "📤 Weiterempfehlen"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenDonate)}
            className={ITEM_CLASS}
          >
            ❤️ Trinkgeld senden
          </button>
          <Link
            href="/impressum"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            ℹ️ Impressum
          </Link>
        </div>
      )}
    </div>
  );
}
