"use client";

import { useFavorites } from "@/lib/favorites";
import { PlugIcon, type PlugType } from "@/components/PlugIcon";
import { PLUG_FILTER_LABELS } from "@/lib/plugs";
import type { Filters } from "@/lib/types";
import { Sheet } from "@/components/ui/Sheet";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { IconMapPin, IconStar } from "@/components/ui/Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (next: Filters) => void;
  hasLocation: boolean;
};

const POWER_PRESETS = [0, 22, 50, 150];
const RANGE_PRESETS = [0, 50, 75, 100, 200];

const PLUG_FILTER_ICON: Record<"type2" | "ccs" | "chademo", PlugType> = {
  type2: "type2",
  ccs: "ccs2",
  chademo: "chademo",
};

const DEFAULT_FILTERS: Filters = {
  minPower: 0,
  current: "any",
  plugType: "any",
  favoritesOnly: false,
  rangeKm: 0,
};

/** Anzahl aktiver Filter (für das Badge am Menü wiederverwendbar). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.current !== "any" ? 1 : 0) +
    (f.minPower > 0 ? 1 : 0) +
    (f.plugType !== "any" ? 1 : 0) +
    (f.rangeKm > 0 ? 1 : 0) +
    (f.favoritesOnly ? 1 : 0)
  );
}

export function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
  hasLocation,
}: Props) {
  const { count: favoriteCount } = useFavorites();
  const count = activeFilterCount(filters);

  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Filter">
      <SheetHeader title="Filter" onClose={onClose} />

      <div className="space-y-4">
        <section>
          <SectionLabel>Strom</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {(["any", "ac", "dc"] as const).map((c) => (
              <Pill
                key={c}
                active={filters.current === c}
                onClick={() => onChange({ ...filters, current: c })}
              >
                {c === "any" ? "Alle" : c.toUpperCase()}
              </Pill>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Leistung</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {POWER_PRESETS.map((p) => (
              <Pill
                key={p}
                active={filters.minPower === p}
                onClick={() => onChange({ ...filters, minPower: p })}
              >
                {p === 0 ? "alle" : `≥ ${p} kW`}
              </Pill>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Stecker</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {(["any", "type2", "ccs", "chademo"] as const).map((pt) => (
              <Pill
                key={pt}
                active={filters.plugType === pt}
                onClick={() => onChange({ ...filters, plugType: pt })}
                className="inline-flex items-center gap-1"
              >
                {pt === "any" ? (
                  "alle"
                ) : (
                  <>
                    <PlugIcon
                      type={PLUG_FILTER_ICON[pt]}
                      width={14}
                      height={14}
                      aria-hidden="true"
                    />
                    {PLUG_FILTER_LABELS[pt]}
                  </>
                )}
              </Pill>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Reichweite um meinen Standort</SectionLabel>
          {hasLocation ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {RANGE_PRESETS.map((km) => (
                  <Pill
                    key={km}
                    active={filters.rangeKm === km}
                    onClick={() => onChange({ ...filters, rangeKm: km })}
                  >
                    {km === 0 ? "aus" : `${km} km`}
                  </Pill>
                ))}
              </div>
              {filters.rangeKm > 0 && (
                <p className="mt-1.5 t-caption text-tertiary">
                  Distanz = Luftlinie (nicht Fahrstrecke).
                </p>
              )}
            </>
          ) : (
            <InfoCallout tone="info" icon={<IconMapPin size={16} />}>
              Zuerst über das Standort-Symbol in der Suche den Standort setzen.
            </InfoCallout>
          )}
        </section>

        <section>
          <SectionLabel>Favoriten</SectionLabel>
          <button
            type="button"
            aria-pressed={filters.favoritesOnly}
            onClick={() =>
              onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
            }
            disabled={favoriteCount === 0 && !filters.favoritesOnly}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              filters.favoritesOnly
                ? "bg-warning text-white"
                : "bg-surface-muted text-secondary hover:bg-border"
            }`}
          >
            <IconStar
              size={14}
              fill={filters.favoritesOnly ? "currentColor" : "none"}
            />
            Nur Favoriten
            {favoriteCount > 0 && (
              <span className="tabular-nums">({favoriteCount})</span>
            )}
          </button>
        </section>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_FILTERS)}
          disabled={count === 0}
        >
          Zurücksetzen
        </Button>
        <Button size="sm" onClick={onClose}>
          Fertig
        </Button>
      </div>
    </Sheet>
  );
}
