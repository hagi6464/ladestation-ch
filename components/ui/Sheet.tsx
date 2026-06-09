"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  /** Extra classes for the panel (e.g. a different max-width). */
  className?: string;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal shell: scrim backdrop, mobile bottom-sheet → desktop centred card.
 * Centralises the behaviour every modal used to copy: Escape to close,
 * click-outside, body scroll-lock, a basic focus trap, and focus restore.
 * Contract is unchanged — render it always and gate with `open`.
 */
export function Sheet({ open, onClose, ariaLabel, children, className = "" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog.
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-surface p-5 shadow-sheet outline-none sm:rounded-sheet ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
