import type { ReactNode } from "react";

type Option<T extends string> = { value: T; label: ReactNode };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
};

/** iOS-style segmented control (e.g. Reiseplaner „Laden bevorzugt"). Keeps the
 *  toggle-button a11y pattern (aria-pressed) the original markup used. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex gap-1 rounded-control bg-surface-muted p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-[7px] px-2 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-surface text-brand shadow-control"
                : "text-secondary hover:text-primary"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
