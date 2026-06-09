import type { HTMLAttributes, LabelHTMLAttributes } from "react";

type Props = {
  as?: "div" | "label";
} & LabelHTMLAttributes<HTMLLabelElement>;

/** Small uppercase section / form label (replaces the repeated
 *  `text-xs uppercase text-zinc-500` headers across the app). */
export function SectionLabel({ as = "div", className = "", ...rest }: Props) {
  const cls = `mb-1 block text-xs font-medium uppercase tracking-wide text-tertiary ${className}`;
  if (as === "label") return <label className={cls} {...rest} />;
  return <div className={cls} {...(rest as HTMLAttributes<HTMLDivElement>)} />;
}
