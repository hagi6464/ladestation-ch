import type { HTMLAttributes } from "react";

type Tone = "neutral" | "brand" | "accent" | "warning" | "danger";
type Variant = "soft" | "solid";

type Props = {
  tone?: Tone;
  variant?: Variant;
} & HTMLAttributes<HTMLSpanElement>;

const SOFT: Record<Tone, string> = {
  neutral: "bg-surface-muted text-secondary",
  brand: "bg-brand-soft text-brand-strong",
  accent: "bg-accent-soft text-accent-strong",
  warning: "bg-warning-soft text-warning-strong",
  danger: "bg-danger-soft text-danger-strong",
};

const SOLID: Record<Tone, string> = {
  neutral: "bg-border-strong text-primary",
  brand: "bg-brand text-on-brand",
  accent: "bg-accent text-on-accent",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
};

/** Compact status / count chip. */
export function Badge({
  tone = "neutral",
  variant = "soft",
  className = "",
  ...rest
}: Props) {
  const tones = variant === "solid" ? SOLID : SOFT;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...rest}
    />
  );
}
