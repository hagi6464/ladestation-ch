import type { ButtonHTMLAttributes } from "react";

type Props = {
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/** Toggleable filter pill. Active = accent (navigation/utility colour).
 *  min-h 36px: Touch-Ziel am Handy — vorher ~28px, deutlich unter Apple/WCAG-Empfehlung. */
export function Pill({ active = false, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-9 rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent text-on-accent"
          : "bg-surface-muted text-secondary hover:bg-border"
      } ${className}`}
      {...rest}
    />
  );
}
