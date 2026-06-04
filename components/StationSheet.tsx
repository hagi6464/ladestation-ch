"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StationDetail, StationPoint } from "@/lib/types";
import { PlugIcon, classifyPlug } from "@/components/PlugIcon";
import { FavoriteButton } from "@/components/FavoriteButton";
import { labelAuthModes, labelAccessibility } from "@/lib/oicp-labels";

type CpoTariffEntry = {
  name: string;
  requiresMembership: boolean;
  monthlyFeeChf?: number;
  acPerKwh?: number;
  dcPerKwh?: number;
  blockingFeeChfPerMin?: number;
  blockingStartsAfterMinutes?: number;
  notes?: string;
};

type CpoTariff = {
  cpoId: string;
  displayName: string;
  websiteUrl: string;
  pricingUrl?: string;
  app?: { name?: string; ios?: string; android?: string };
  platformNote?: { headline: string; body: string; tip?: string };
  tariffs: CpoTariffEntry[];
  lastUpdated: string;
};

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

async function fetchTariff(evseId: string): Promise<TariffResponse> {
  const res = await fetch(`/api/prices/${encodeURIComponent(evseId)}`);
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
};

async function fetchStation(evseId: string): Promise<StationDetail> {
  const res = await fetch(`/api/stations/${encodeURIComponent(evseId)}`);
  if (!res.ok) throw new Error(`Station ${evseId} failed: ${res.status}`);
  return res.json();
}

function CpoStandardTariffSection({ cpo }: { cpo: CpoTariff }) {
  let host = "";
  try {
    host = new URL(cpo.pricingUrl ?? cpo.websiteUrl).host.replace(
      /^www\./,
      "",
    );
  } catch {
    host = cpo.websiteUrl;
  }
  const isPlatform = !!cpo.platformNote;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase text-zinc-500">
          {isPlatform ? "Tarif-Info" : "Eigentarif des Betreibers"}
        </div>
        <div className="text-[10px] text-zinc-400">{cpo.displayName}</div>
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
              <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-3 text-blue-900 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-100">
                <div className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <div className="space-y-1">
                    {headline && (
                      <div className="text-sm font-semibold leading-snug">
                        {headline}
                      </div>
                    )}
                    {body && (
                      <div className="text-xs leading-relaxed">{body}</div>
                    )}
                  </div>
                </div>
              </div>
              {tip && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                  <span aria-hidden="true">💡</span>
                  <span className="leading-relaxed">{tip}</span>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Pay-per-Use-Tarif laut Anbieter-Website. Mit Anbieter-eigenem Abo
          oft günstiger, mit Roaming-Karten anderer Provider meist teurer.
          Preise sind kuratiert und können veraltet sein.
        </div>
      )}
      <ul className="space-y-1.5">
        {cpo.tariffs.map((t, idx) => (
          <li
            key={`${cpo.cpoId}-${idx}`}
            className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {t.name}
              </div>
              {t.requiresMembership && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Abo nötig
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-700 dark:text-zinc-200">
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
              <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                {t.notes}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between text-[10px] text-zinc-400">
        <a
          href={cpo.pricingUrl ?? cpo.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
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
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Lade Tarifinfo…
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        Tarifinfo konnte nicht geladen werden: {state.error.message}
      </div>
    );
  }
  const data = state.data;
  if (!data || data.ok === false) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Für diesen Betreiber liegt kein hinterlegter Tarif vor.
      </div>
    );
  }
  return <CpoStandardTariffSection cpo={data.cpoStandardTariff} />;
}

function availabilityBadge(data: StationDetail) {
  if (!data.hasStatus)
    return {
      label: `${data.total} Ladepunkt${data.total === 1 ? "" : "e"}`,
      className: "bg-zinc-100 text-zinc-600",
    };
  const cls =
    data.available >= 1
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-700";
  return {
    label: `${data.available} von ${data.total} frei`,
    className: cls,
  };
}

function pointStatus(status: string | null) {
  if (status === "Available") return { label: "Frei", dot: "bg-emerald-500" };
  if (status === "Occupied") return { label: "Besetzt", dot: "bg-red-500" };
  if (status === "Reserved") return { label: "Reserviert", dot: "bg-amber-500" };
  if (status === "OutOfService")
    return { label: "Ausser Betrieb", dot: "bg-zinc-400" };
  return { label: "Unbekannt", dot: "bg-zinc-300" };
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
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase text-zinc-500">
          Ladepunkte ({points.length})
        </div>
        {plugTypes.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {plugTypes.map(({ type, label }) => (
              <span
                key={type}
                title={label}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
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
        {points.map((p) => {
          const st = pointStatus(p.status);
          const plugLabels = Array.from(
            new Set(p.plugs.map((pl) => classifyPlug(pl).label)),
          );
          return (
            <li
              key={p.evseId}
              className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1 text-xs dark:bg-zinc-800/60"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`}
                title={st.label}
                aria-label={st.label}
              />
              <span className="font-medium tabular-nums">
                {p.maxPowerKw ? `${p.maxPowerKw} kW` : "–"}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="truncate text-zinc-600 dark:text-zinc-300">
                {plugLabels.join(", ") || "—"}
              </span>
              <span className="ml-auto shrink-0 text-zinc-500">
                {st.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StationSheet({ evseId, onClose }: Props) {
  const [showNav, setShowNav] = useState(false);
  const { data, isPending, error } = useQuery({
    queryKey: ["station", evseId],
    queryFn: () => fetchStation(evseId!),
    enabled: !!evseId,
  });
  const tariff = useQuery({
    queryKey: ["tariff", evseId],
    queryFn: () => fetchTariff(evseId!),
    enabled: !!evseId,
    staleTime: 5 * 60_000,
  });

  if (!evseId) return null;

  const appCpo =
    tariff.data && tariff.data.ok ? tariff.data.cpoStandardTariff : null;
  const stationApp = appCpo?.app ?? null;

  return (
    <aside
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-20 sm:max-h-none sm:w-96 sm:rounded-2xl"
      aria-label="Stationsdetails"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {data?.name ?? "Ladestation"}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <FavoriteButton evseId={evseId} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Schliessen"
          >
            ✕
          </button>
        </div>
      </div>

      {isPending && <p className="text-sm text-zinc-500">Lade Details…</p>}
      {error && (
        <p className="text-sm text-red-600">
          Fehler: {(error as Error).message}
        </p>
      )}

      {data && (
        <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-200">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                availabilityBadge(data).className
              }`}
            >
              {availabilityBadge(data).label}
            </span>
            {data.points.some((p) => p.isDc) && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                DC
              </span>
            )}
            {data.points.some((p) => p.isAc) && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                AC
              </span>
            )}
            {(() => {
              const maxKw = Math.max(
                0,
                ...data.points.map((p) => p.maxPowerKw ?? 0),
              );
              return maxKw > 0 ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  bis {maxKw} kW
                </span>
              ) : null;
            })()}
            {data.renewableEnergy && (
              <span
                title="100% erneuerbare Energie"
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
              >
                🌱 100% erneuerbar
              </span>
            )}
            <span
              title={
                data.isOpen24h
                  ? "Rund um die Uhr zugänglich"
                  : "Nicht durchgehend zugänglich"
              }
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                data.isOpen24h
                  ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {data.isOpen24h ? "24 h Zugang" : "Kein 24 h Zugang"}
            </span>
          </div>

          {(data.operatorName || data.hotline) && (
            <div>
              <div className="text-xs uppercase text-zinc-500">Betreiber</div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {data.operatorName && <div>{data.operatorName}</div>}
                  {data.hotline && (
                    <a
                      href={`tel:${data.hotline.replace(/\s/g, "")}`}
                      className="mt-0.5 inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                      </svg>
                      {data.hotline}
                    </a>
                  )}
                </div>
                {appCpo && stationApp && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        pickStoreUrl(stationApp, appCpo.websiteUrl),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    title="Öffnet die App im Store – startet sie, falls installiert."
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-500"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    App öffnen
                  </button>
                )}
              </div>
            </div>
          )}

          <PointsList points={data.points} />

          <div>
            <div className="text-xs uppercase text-zinc-500">Adresse</div>
            <div className="flex items-start justify-between gap-3">
              <div>
                {data.street ?? "—"}
                <br />
                {data.postalCode ?? ""} {data.city ?? ""}
              </div>
              {!showNav && (
                <button
                  type="button"
                  onClick={() => setShowNav(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  Navigation
                </button>
              )}
            </div>
            {showNav && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase text-zinc-500">
                    Mit welcher App?
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNav(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300"
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
              <div className="text-xs uppercase text-zinc-500">
                Zahlung &amp; Zugang
              </div>
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
                      className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <TariffSection state={tariff} />

          <div className="text-xs text-zinc-500">EVSE-ID: {data.evseId}</div>
        </div>
      )}
    </aside>
  );
}
