import type { ButtonHTMLAttributes } from "react";

type Props = {
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/** Toggleable filter pill. Active = accent (navigation/utility colour). */
export function Pill({ active = false, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-accent text-on-accent"
          : "bg-surface-muted text-secondary hover:bg-border"
      } ${className}`}
      {...rest}
    />
  );
}
