"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StationDetail, StationPoint } from "@/lib/types";
import type { CpoTariff } from "@/lib/cpo-tariffs";
import { PlugIcon, classifyPlug } from "@/components/PlugIcon";
import { FavoriteButton } from "@/components/FavoriteButton";
import { labelAuthModes, labelAccessibility } from "@/lib/oicp-labels";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  IconCheck,
  IconClose,
  IconInfo,
  IconLeaf,
  IconLightbulb,
  IconNavigation,
  IconPhone,
  IconShare,
  IconSmartphone,
} from "@/components/ui/Icon";

type TariffResponse =
  | {
      ok: true;
      station: { evseId: string; operatorName: string | null };
      cpoStandardTariff: CpoTariff;
    }
  | {
      ok: false;
      reason: string;
    };

async function fetchTariff(
  evseId: string,
  signal: AbortSignal,
): Promise<TariffResponse> {
  const res = await fetch(`/api/prices/${encodeURIComponent(evseId)}`, {
    signal,
  });
  const body = (await res.json()) as TariffResponse;
  if (!res.ok && (body as { ok?: boolean }).ok !== false) {
    throw new Error(`tariff HTTP ${res.status}`);
  }
  return body;
}

type NavApp = {
  id: string;
  label: string;
  build: (lat: number, lon: number) => string;
};

const NAV_APPS: NavApp[] = [
  {
    id: "google",
    label: "Google Maps",
    build: (lat, lon) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
  },
  {
    id: "apple",
    label: "Apple Karten",
    build: (lat, lon) => `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`,
  },
  {
    id: "waze",
    label: "Waze",
    build: (lat, lon) => `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`,
  },
  {
    id: "osm",
    label: "OpenStreetMap",
    build: (lat, lon) =>
      `https://www.openstreetmap.org/directions?to=${lat},${lon}`,
  },
];

/**
 * Passende Store-Seite zur erkannten Plattform. Die Store-Seite öffnet die App,
 * falls installiert — sonst bietet sie die Installation an. Desktop/unbekannt:
 * erste vorhandene Store-Seite, sonst die Anbieter-Website.
 */
function pickStoreUrl(
  app: { ios?: string; android?: string },
  websiteUrl: string,
): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS meldet sich als „Macintosh" mit Touch
    (/Macintosh/.test(ua) &&
      typeof document !== "undefined" &&
      "ontouchend" in document);
  const isAndroid = /Android/.test(ua);
  if (isIos && app.ios) return app.ios;
  if (isAndroid && app.android) return app.android;
  return app.ios ?? app.android ?? websiteUrl;
}

type Props = {
  evseId: string | null;
  onClose: () => void;
  /** Reise-Modus: nach kurzer Zeit fragen, ob die Säule in den Reiseplan soll. */
  tripPrompt?: boolean;
  /** Säule zusätzlich in den Reiseplan aufnehmen. */
  onTripAdd?: () => void;
  /** Zuletzt gewählten Ladestopp durch diese Säule ersetzen. */
  onTripReplace?: () => void;
};

async function fetchStation(
  evseId: string,
  signal: AbortSignal,
): Promise<StationDetail> {
  const res = await fetch(`/api/stations/${encodeURIComponent(evseId)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Station ${evseId} failed: ${res.status}`);
  return res.json();
}

function CpoStandardTariffSection({ cpo }: { cpo: CpoTariff }) {
  let host = "";
  try {
    host = new URL(cpo.pricingUrl ?? cpo.websiteUrl).host.replace(/^www\./, "");
  } catch {
    host = cpo.websiteUrl;
  }
  const isPlatform = !!cpo.platformNote;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <SectionLabel className="mb-0">
          {isPlatform ? "Tarif-Info" : "Eigentarif des Betreibers"}
        </SectionLabel>
        <div className="t-caption text-tertiary">{cpo.displayName}</div>
      </div>
      {cpo.platformNote ? (
        (() => {
          const note: unknown = cpo.platformNote;
          const obj =
            typeof note === "object" && note !== null
              ? (note as { headline?: unknown; body?: unknown; tip?: unknown })
              : null;
          const headline = obj?.headline ? String(obj.headline) : "";
          const body = obj?.body
            ? String(obj.body)
            : typeof note === "string"
              ? note
              : "";
          const tip = obj?.tip ? String(obj.tip) : "";
          return (
            <div className="space-y-2">
              <InfoCallout tone="info" icon={<IconInfo size={18} />}>
                {headline && (
                  <div className="text-sm font-semibold leading-snug">
                    {headline}
                  </div>
                )}
                {body && <div className="mt-1">{body}</div>}
              </InfoCallout>
              {tip && (
                <InfoCallout tone="warn" icon={<IconLightbulb size={16} />}>
                  {tip}
                </InfoCallout>
              )}
            </div>
          );
        })()
      ) : (
        <InfoCallout tone="info">
          Pay-per-Use-Tarif laut Anbieter-Website. Mit Anbieter-eigenem Abo oft
          günstiger, mit Roaming-Karten anderer Provider meist teurer. Preise
          sind kuratiert und können veraltet sein.
        </InfoCallout>
      )}
      <ul className="space-y-1.5">
        {cpo.tariffs.map((t, idx) => (
          <li
            key={`${cpo.cpoId}-${idx}`}
            className="rounded-card border border-border bg-surface p-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-medium text-primary">{t.name}</div>
              {t.requiresMembership && <Badge tone="warning">Abo nötig</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-secondary">
              {t.acPerKwh != null && (
                <span>
                  AC{" "}
                  <span className="font-semibold tabular-nums">
                    {t.acPerKwh.toFixed(2)} CHF/kWh
                  </span>
                </span>
              )}
              {t.dcPerKwh != null && (
                <span>
                  DC{" "}
                  <span className="font-semibold tabular-nums">
                    {t.dcPerKwh.toFixed(2)} CHF/kWh
                  </span>
                </span>
              )}
              {t.monthlyFeeChf != null && t.monthlyFeeChf > 0 && (
                <span>
                  Abo{" "}
                  <span className="font-semibold tabular-nums">
                    {t.monthlyFeeChf.toFixed(2)} CHF/Monat
                  </span>
                </span>
              )}
              {t.blockingFeeChfPerMin != null && (
                <span>
                  Blockiergebühr{" "}
                  <span className="font-semibold tabular-nums">
                    {t.blockingFeeChfPerMin.toFixed(2)} CHF/min
                  </span>
                  {t.blockingStartsAfterMinutes != null &&
                    ` ab ${t.blockingStartsAfterMinutes} min`}
                </span>
              )}
            </div>
            {t.notes && (
              <div className="mt-1 t-caption text-tertiary">{t.notes}</div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between t-caption text-tertiary">
        <a
          href={cpo.pricingUrl ?? cpo.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Aktueller Tarif auf {host} ↗
        </a>
        <span>Stand: {cpo.lastUpdated}</span>
      </div>
    </div>
  );
}

function TariffSection({
  state,
}: {
  state: ReturnType<typeof useQuery<TariffResponse, Error>>;
}) {
  if (state.isPending) {
    return (
      <div className="rounded-card bg-surface-muted px-3 py-2 text-xs text-secondary">
        Lade Tarifinfo…
      </div>
    );
  }
  if (state.error) {
    return (
      <InfoCallout tone="danger">
        Tarifinfo konnte nicht geladen werden: {state.error.message}
      </InfoCallout>
    );
  }
  const data = state.data;
  if (!data || data.ok === false) {
    return (
      <div className="rounded-card bg-surface-muted px-3 py-2 text-xs text-secondary">
        Für diesen Betreiber liegt kein hinterlegter Tarif vor.
      </div>
    );
  }
  return <CpoStandardTariffSection cpo={data.cpoStandardTariff} />;
}

function availabilityBadge(data: StationDetail): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  if (!data.hasStatus)
    return {
      label: `${data.total} Ladepunkt${data.total === 1 ? "" : "e"}`,
      tone: "neutral",
    };
  return {
    label: `${data.available} von ${data.total} frei`,
    tone: data.available >= 1 ? "brand" : "danger",
  };
}

function pointStatus(status: string | null) {
  if (status === "Available") return { label: "Frei", dot: "bg-brand" };
  if (status === "Occupied") return { label: "Besetzt", dot: "bg-danger" };
  if (status === "Reserved") return { label: "Reserviert", dot: "bg-warning" };
  if (status === "OutOfService")
    return { label: "Ausser Betrieb", dot: "bg-tertiary" };
  return { label: "Unbekannt", dot: "bg-border-strong" };
}

function PointsList({ points }: { points: StationPoint[] }) {
  const plugTypes = Array.from(
    new Map(
      points
        .flatMap((p) => p.plugs)
        .map((pl) => {
          const c = classifyPlug(pl);
          return [c.type, c] as const;
        }),
    ).values(),
  );
  // Stecker-Text je Zeile nur bei gemischten Steckern zeigen — bei einheitlichem
  // Stecker steht der Typ schon in der Überschrift.
  const showPlugPerRow = plugTypes.length > 1;

  // Identische Punkte (Leistung + Stecker + Status) zu einer Zeile mit Anzahl bündeln.
  const groups = Array.from(
    points
      .reduce(
        (map, p) => {
          const plugLabels = Array.from(
            new Set(p.plugs.map((pl) => classifyPlug(pl).label)),
          );
          const key = `${p.maxPowerKw ?? ""}|${plugLabels.join(",")}|${p.status ?? ""}`;
          const existing = map.get(key);
          if (existing) existing.count += 1;
          else
            map.set(key, {
              key,
              count: 1,
              maxPowerKw: p.maxPowerKw,
              plugLabels,
              status: p.status,
            });
          return map;
        },
        new Map<
          string,
          {
            key: string;
            count: number;
            maxPowerKw: number | null;
            plugLabels: string[];
            status: string | null;
          }
        >(),
      )
      .values(),
  );
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel className="mb-0">
          Ladepunkte ({points.length})
        </SectionLabel>
        {plugTypes.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {plugTypes.map(({ type, label }) => (
              <span
                key={type}
                title={label}
                className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] text-secondary"
              >
                <PlugIcon
                  type={type}
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <ul className="mt-1 space-y-1">
        {groups.map((g) => {
          const st = pointStatus(g.status);
          return (
            <li
              key={g.key}
              className="flex items-center gap-2 rounded-md bg-surface-muted px-2 py-1 text-xs"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`}
                title={st.label}
                aria-label={st.label}
              />
              {g.count > 1 && (
                <span className="shrink-0 font-medium tabular-nums text-tertiary">
                  {g.count}×
                </span>
              )}
              <span className="font-medium tabular-nums text-primary">
                {g.maxPowerKw ? `${g.maxPowerKw} kW` : "–"}
              </span>
              {showPlugPerRow && (
                <>
                  <span className="text-tertiary">·</span>
                  <span className="truncate text-secondary">
                    {g.plugLabels.join(", ") || "—"}
                  </span>
                </>
              )}
              <span className="ml-auto shrink-0 text-tertiary">{st.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StationSheet({
  evseId,
  onClose,
  tripPrompt,
  onTripAdd,
  onTripReplace,
}: Props) {
  const [showNav, setShowNav] = useState(false);
  const [shared, setShared] = useState(false);
  const { data, isPending, error } = useQuery({
    queryKey: ["station", evseId],
    queryFn: ({ signal }) => fetchStation(evseId!, signal),
    enabled: !!evseId,
  });
  const tariff = useQuery({
    queryKey: ["tariff", evseId],
    queryFn: ({ signal }) => fetchTariff(evseId!, signal),
    enabled: !!evseId,
    staleTime: 5 * 60_000,
  });

  // Reise-Modus-Nachfrage „zum Reiseplan?" erst nach kurzer Zeit zeigen, damit
  // man zuerst die Stations-Infos sieht.
  const [showTripPrompt, setShowTripPrompt] = useState(false);
  useEffect(() => {
    if (!tripPrompt || !evseId) return;
    const t = setTimeout(() => setShowTripPrompt(true), 1200);
    // Cleanup (Säulenwechsel/Schliessen) setzt die Nachfrage wieder zurück.
    return () => {
      clearTimeout(t);
      setShowTripPrompt(false);
    };
  }, [tripPrompt, evseId]);

  // Navigations-Auswahl schliessen, wenn eine andere Säule geöffnet wird
  // (State-Reset beim Säulenwechsel ohne Effekt — empfohlenes React-Muster).
  const [prevEvseId, setPrevEvseId] = useState(evseId);
  if (evseId !== prevEvseId) {
    setPrevEvseId(evseId);
    setShowNav(false);
  }

  if (!evseId) return null;

  const appCpo =
    tariff.data && tariff.data.ok ? tariff.data.cpoStandardTariff : null;
  const stationApp = appCpo?.app ?? null;

  // Diese Säule teilen: Deep-Link, der die App auf die Säule fliegen lässt
  // und das Detail öffnet. Native Teilen-Liste, sonst Link kopieren.
  async function handleShare() {
    if (!data) return;
    const label = data.name ?? "Ladestation";
    const url = `${window.location.origin}/?fly=${data.lat},${data.lon}&open=${encodeURIComponent(
      data.evseId,
    )}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: label,
          text: `${label} – Ladestation Schweiz`,
          url,
        });
      } catch {
        // Teilen abgebrochen — bewusst ignorieren
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // Zwischenablage nicht verfügbar — ignorieren
    }
  }

  const avail = data ? availabilityBadge(data) : null;
  const maxKw = data
    ? Math.max(0, ...data.points.map((p) => p.maxPowerKw ?? 0))
    : 0;

  return (
    <aside
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-sheet border border-border bg-surface p-5 shadow-sheet sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-20 sm:max-h-none sm:w-96 sm:rounded-sheet"
      aria-label="Stationsdetails"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="t-title text-primary">{data?.name ?? "Ladestation"}</h2>
        <div className="flex shrink-0 items-center gap-1">
          {data && (
            <IconButton
              label={shared ? "Link kopiert" : "Säule teilen"}
              onClick={handleShare}
            >
              {shared ? <IconCheck size={20} /> : <IconShare size={20} />}
            </IconButton>
          )}
          <FavoriteButton evseId={evseId} />
          <IconButton label="Schliessen" onClick={onClose}>
            <IconClose size={20} />
          </IconButton>
        </div>
      </div>

      {tripPrompt && showTripPrompt && (
        <InfoCallout tone="success" className="mb-4 flex-col">
          <p className="text-sm font-medium">Diese Säule zum Reiseplan?</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => {
                onTripAdd?.();
                onClose();
              }}
            >
              Zusätzlich
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                onTripReplace?.();
                onClose();
              }}
            >
              Vorherige ersetzen
            </Button>
          </div>
        </InfoCallout>
      )}

      {isPending && <p className="t-body text-tertiary">Lade Details…</p>}
      {error && (
        <p className="t-body text-danger">Fehler: {(error as Error).message}</p>
      )}

      {data && (
        <div className="space-y-4 text-sm text-secondary">
          <div className="flex flex-wrap items-center gap-2">
            {avail && <Badge tone={avail.tone}>{avail.label}</Badge>}
            {data.points.some((p) => p.isDc) && <Badge tone="accent">DC</Badge>}
            {data.points.some((p) => p.isAc) && <Badge tone="accent">AC</Badge>}
            {maxKw > 0 && <Badge tone="neutral">bis {maxKw} kW</Badge>}
            {data.renewableEnergy && (
              <Badge
                tone="brand"
                variant="solid"
                title="100% erneuerbare Energie"
              >
                <IconLeaf size={12} />
                100% erneuerbar
              </Badge>
            )}
            <Badge
              tone={data.isOpen24h ? "neutral" : "warning"}
              title={
                data.isOpen24h
                  ? "Rund um die Uhr zugänglich"
                  : "Nicht durchgehend zugänglich"
              }
            >
              {data.isOpen24h ? "24 h Zugang" : "Kein 24 h Zugang"}
            </Badge>
          </div>

          {(data.operatorName || data.hotline) && (
            <div>
              <SectionLabel>Betreiber</SectionLabel>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {data.operatorName && <div>{data.operatorName}</div>}
                  {data.hotline && (
                    <a
                      href={`tel:${data.hotline.replace(/\s/g, "")}`}
                      className="mt-0.5 inline-flex items-center gap-1.5 text-accent hover:underline"
                    >
                      <IconPhone size={14} />
                      {data.hotline}
                    </a>
                  )}
                </div>
                {appCpo && stationApp && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      window.open(
                        pickStoreUrl(stationApp, appCpo.websiteUrl),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    title="Öffnet die App im Store – startet sie, falls installiert."
                    className="shrink-0 text-xs"
                  >
                    <IconSmartphone size={14} />
                    App öffnen
                  </Button>
                )}
              </div>
            </div>
          )}

          <PointsList points={data.points} />

          <div>
            <SectionLabel>Adresse</SectionLabel>
            <div className="flex items-start justify-between gap-3">
              <div>
                {data.street ?? "—"}
                <br />
                {data.postalCode ?? ""} {data.city ?? ""}
              </div>
              {!showNav && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setShowNav(true)}
                  className="shrink-0 text-xs"
                >
                  <IconNavigation size={14} />
                  Navigation
                </Button>
              )}
            </div>
            {showNav && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel className="mb-0">Mit welcher App?</SectionLabel>
                  <button
                    type="button"
                    onClick={() => setShowNav(false)}
                    className="text-xs text-tertiary hover:text-secondary"
                  >
                    Abbrechen
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {NAV_APPS.map((app) => (
                    <a
                      key={app.id}
                      href={app.build(data.lat, data.lon)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowNav(false)}
                      className="rounded-control border border-border bg-surface px-3 py-2 text-center text-sm font-medium text-secondary transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent"
                    >
                      {app.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(data.authModes.length > 0 ||
            labelAccessibility(data.accessibility)) && (
            <div>
              <SectionLabel>Zahlung &amp; Zugang</SectionLabel>
              {labelAccessibility(data.accessibility) && (
                <div className="mb-1">
                  {labelAccessibility(data.accessibility)}
                </div>
              )}
              {data.authModes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {labelAuthModes(data.authModes).map((m) => (
                    <span
                      key={m}
                      className="rounded-md bg-surface-muted px-2 py-0.5 text-xs text-secondary"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <TariffSection state={tariff} />

          <div className="t-caption text-tertiary">EVSE-ID: {data.evseId}</div>
        </div>
      )}
    </aside>
  );
}
