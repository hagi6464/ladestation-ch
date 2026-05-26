"use client";

import type { Filters } from "@/lib/types";

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
};

const POWER_PRESETS = [0, 22, 50, 150];

export function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-sm shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
      <span className="font-medium text-zinc-700 dark:text-zinc-200">
        Filter:
      </span>

      <div className="flex items-center gap-1">
        {(["any", "ac", "dc"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ ...filters, current: c })}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filters.current === c
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {c === "any" ? "Alle" : c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          ab kW:
        </span>
        {POWER_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...filters, minPower: p })}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filters.minPower === p
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {p === 0 ? "alle" : `≥${p}`}
          </button>
        ))}
      </div>
    </div>
  );
}
