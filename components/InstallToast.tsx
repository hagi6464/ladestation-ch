"use client";

import { useEffect, useState } from "react";
import { useInstall } from "@/lib/install";

const STORAGE_KEY = "ladestation-install-hint-seen";
const SHOW_DELAY_MS = 1500;
const AUTO_DISMISS_MS = 6500;

export function InstallToast() {
  const { canInstall, isStandalone, isIosSafari } = useInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone) return;
    if (!canInstall && !isIosSafari) return;

    const t = setTimeout(() => {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
      setOpen(true);
      window.localStorage.setItem(STORAGE_KEY, "1");
    }, SHOW_DELAY_MS);

    return () => clearTimeout(t);
  }, [canInstall, isStandalone, isIosSafari]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto max-w-sm rounded-full bg-zinc-900/95 px-4 py-2 text-center text-xs text-zinc-100 shadow-lg backdrop-blur dark:bg-zinc-100/95 dark:text-zinc-900">
        💡 Tippe auf <strong>«⚡ Ladestation Schweiz»</strong>, um die Karte als App zu speichern.
      </div>
    </div>
  );
}
