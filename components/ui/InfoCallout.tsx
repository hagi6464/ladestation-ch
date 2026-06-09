import type { ReactNode } from "react";

type Tone = "info" | "warn" | "danger" | "success";

type Props = {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

const TONE: Record<Tone, string> = {
  info: "bg-accent-soft border-accent-border text-accent-strong",
  warn: "bg-warning-soft border-warning-border text-warning-strong",
  danger: "bg-danger-soft border-danger-border text-danger-strong",
  success: "bg-brand-soft border-brand-border text-brand-strong",
};

/** Tinted, bordered note box (replaces the ~9 inline blue/amber/red/emerald
 *  info boxes). Body text uses the tone's AA-contrast strong colour. */
export function InfoCallout({
  tone = "info",
  icon,
  className = "",
  children,
}: Props) {
  return (
    <div
      className={`flex gap-2 rounded-card border px-3 py-2 text-xs ${TONE[tone]} ${className}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
