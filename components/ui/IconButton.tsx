import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  /** Accessible name — set as both aria-label and title. */
  label: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title">;

/** Round, icon-only button (close, share, locate, clear …). Enforces an
 *  accessible label so an icon never ships without a name.
 *  min 36px Kantenlänge: Touch-Ziel am Handy — vorher ~30px mit p-1.5. */
export function IconButton({ label, className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted hover:text-primary disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
