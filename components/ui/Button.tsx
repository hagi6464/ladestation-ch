import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type Props = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-on-brand shadow-control hover:bg-brand-hover",
  accent: "bg-accent text-on-accent shadow-control hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-primary hover:bg-surface-muted",
  ghost: "text-secondary hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm font-semibold",
};

/** Shared CTA / action button. Logic stays at the call-site; this only styles
 *  the existing button + optional inline loading spinner. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
