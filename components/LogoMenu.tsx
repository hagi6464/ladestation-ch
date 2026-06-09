"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  IconBookOpen,
  IconCheck,
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconHeart,
  IconInfo,
  IconRoute,
  IconShare,
} from "@/components/ui/Icon";

type Props = {
  /** Filter-Fenster öffnen (Teil der Ladestation-Suche). */
  onOpenFilter: () => void;
  /** Anzahl aktiver Filter (Badge). */
  filterCount: number;
  /** Reiseplaner öffnen. */
  onOpenTrip: () => void;
  onOpenGuide: () => void;
  onOpenInstall: () => void;
  onOpenDonate: () => void;
};

const SECTION =
  "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-tertiary";
const ITEM =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-primary hover:bg-surface-muted";
const ITEM_PRIMARY =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-brand hover:bg-brand-soft";
const DIVIDER = "my-1 border-t border-border";

export function LogoMenu({
  onOpenFilter,
  filterCount,
  onOpenTrip,
  onOpenGuide,
  onOpenInstall,
  onOpenDonate,
}: Props) {
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
        className="relative inline-flex items-center gap-1 rounded-control bg-surface/95 p-1.5 pr-2 shadow-popover backdrop-blur transition-colors hover:bg-surface"
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
        <IconChevronDown
          size={14}
          className={`text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
        />
        {filterCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-on-accent"
          >
            {filterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menü"
          className="absolute left-0 top-full z-30 mt-1 min-w-56 overflow-hidden rounded-popover border border-border bg-surface py-1 shadow-popover"
        >
          {/* 1) Ladestation suchen */}
          <div className={SECTION}>Ladestation suchen</div>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenFilter)}
            className={ITEM}
          >
            <IconFilter size={18} />
            Filter
            {filterCount > 0 && (
              <Badge tone="accent" variant="solid" className="ml-auto">
                {filterCount}
              </Badge>
            )}
          </button>

          {/* 2) Reiseplaner */}
          <div className={DIVIDER} />
          <div className={SECTION}>Reiseplaner</div>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenTrip)}
            className={ITEM_PRIMARY}
          >
            <IconRoute size={18} />
            Route planen
          </button>

          {/* 3) Weitere Funktionen */}
          <div className={DIVIDER} />
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenGuide)}
            className={ITEM}
          >
            <IconBookOpen size={18} />
            Kurzanleitung
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenInstall)}
            className={ITEM}
          >
            <IconDownload size={18} />
            Als App speichern
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleShare}
            className={ITEM}
          >
            {copied ? <IconCheck size={18} /> : <IconShare size={18} />}
            {copied ? "Link kopiert" : "Weiterempfehlen"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenDonate)}
            className={ITEM}
          >
            <IconHeart size={18} />
            Trinkgeld senden
          </button>
          <Link
            href="/impressum"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ITEM}
          >
            <IconInfo size={18} />
            Impressum
          </Link>
        </div>
      )}
    </div>
  );
}
