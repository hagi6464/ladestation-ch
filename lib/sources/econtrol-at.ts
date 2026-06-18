import type { NewStation, NewStationStatus } from "@/lib/db/schema";

/**
 * Adapter für das österreichische Ladestellenverzeichnis der E-Control
 * (nationales Register, AFIR-konform). Public-API:
 * `https://api.e-control.at/charge/1.0` — Auth per `Apikey`-Header + `Referer`
 * (Domain muss im E-Control-Account freigeschaltet sein).
 *
 * Datenmodell ist operator-zentriert (kein Einzel-Bulk-Feed wie beim CH-BFE):
 *   /countries/AT/operators                          → Betreiberliste
 *   /countries/AT/operators/{id}/stations            → Standorte des Betreibers
 *   /countries/AT/operators/{id}/stations/{sid}/points → Ladepunkte (EVSEs)
 * Erst die `points` liefern evseId, Leistung, Stecker, Stromart und Echtzeit-Status.
 */

const BASE = "https://api.e-control.at/charge/1.0";
const COUNTRY = "AT";

/** Auth-Header. Key aus Env; Referer = im E-Control-Account freigeschaltete Domain. */
function authHeaders(): Record<string, string> {
  const key = process.env.ECONTROL_API_KEY ?? process.env.ECONTROL_API_USER ?? "";
  const referer = process.env.ECONTROL_REFERER ?? "https://ladestation-ch.vercel.app";
  return { Apikey: key, Referer: referer };
}

// ---- Roh-Typen (nur genutzte Felder) ------------------------------------

export type EcOperator = {
  operatorId: string;
  organization: string | null;
  status?: string | null;
};

export type EcStation = {
  stationId: string;
  stationStatus?: string | null;
  label?: string | null;
  country?: string | null;
  postCode?: string | null;
  city?: string | null;
  street?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phoneCountryCode?: string | null;
  regionCode?: string | null;
  phoneNumber?: string | null;
  greenEnergy?: boolean | null;
  maxCapacityKw?: number | null;
  openingHours?: EcOpeningHour[] | null;
};

export type EcOpeningHour = {
  fromWeekday?: string;
  fromTime?: string;
  toWeekday?: string;
  toTime?: string;
};

export type EcPoint = {
  evseId: string;
  capacityKw?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  authenticationMode?: string[] | null;
  connectorType?: string[] | null;
  electricityType?: string[] | null;
  status?: string | null;
};

// ---- Mapping-Helfer ------------------------------------------------------

// E-Control mischt zwei Steckerschemata (z. B. CTYPE2 UND IEC_62196_T2). Schlüssel
// werden auf Grossbuchstaben ohne Sonderzeichen normalisiert, dann nachgeschlagen.
// Zielstrings sind mit den lib/plugs.ts-Needles (type 2 / ccs / chademo) kompatibel.
const CONNECTOR_MAP: Record<string, string> = {
  CTYPE2: "Type 2",
  IEC62196T2: "Type 2",
  STYPE2: "Type 2",
  CTYPE1: "Type 1",
  IEC62196T1: "Type 1",
  STYPE1: "Type 1",
  CTYPE3: "Type 3",
  STYPE3: "Type 3",
  CCCS2: "CCS Combo 2",
  CTYPE2COMBO: "CCS Combo 2",
  IEC62196T2COMBO: "CCS Combo 2",
  CCS: "CCS Combo 2",
  CCS2: "CCS Combo 2",
  CCCS1: "CCS Combo 1",
  IEC62196T1COMBO: "CCS Combo 1",
  CHADEMO: "CHAdeMO",
  CG105: "CHAdeMO",
  CTESLA: "Tesla Connector",
  TESLA: "Tesla Connector",
  SCHUKO: "Schuko",
  SCEE78: "Schuko",
  DOMESTIC: "Schuko",
  CEE: "CEE",
  S3091P16A: "CEE",
  S3091P32A: "CEE",
  S3093P16A: "CEE",
  S3093P32A: "CEE",
  WINDUCTIVE: "Induktiv",
  WRESONANT: "Induktiv",
};

/** E-Control-ConnectorType → unser plugs[]-Vokabular (kompatibel mit lib/plugs.ts). */
export function mapConnector(type: string): string {
  const key = type.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CONNECTOR_MAP[key] ?? type; // unbekannt: roh durchreichen
}

/** electricityType[] → AC/DC-Flags (Heuristik wie beim BFE als Sicherung). */
export function classifyElectricity(
  types: string[] | null | undefined,
  capacityKw: number | null | undefined,
): { isAc: boolean; isDc: boolean } {
  let isAc = false;
  let isDc = false;
  for (const t of types ?? []) {
    const u = t.toUpperCase();
    if (u.startsWith("AC")) isAc = true;
    if (u.startsWith("DC")) isDc = true;
  }
  if (!isAc && !isDc && capacityKw != null && capacityKw >= 50) isDc = true;
  return { isAc, isDc };
}

/** E-Control-Status → unser Status-Vokabular (kompatibel mit der „Unknown"-Logik). */
export function mapStatus(status: string | null | undefined): string {
  switch ((status ?? "").toUpperCase()) {
    case "AVAILABLE":
      return "Available";
    case "OCCUPIED":
    case "CHARGING":
      return "Occupied";
    case "RESERVED":
      return "Reserved";
    case "OUT_OF_SERVICE":
    case "FAULTED":
    case "INOPERATIVE":
      return "OutOfService";
    default:
      return "Unknown";
  }
}

/** Ganzwöchig 00:00–24:00 → 24h. */
export function isOpen24h(hours: EcOpeningHour[] | null | undefined): boolean {
  if (!hours || hours.length !== 1) return false;
  const h = hours[0];
  return (
    h.fromWeekday === "MONDAY" &&
    h.toWeekday === "SUNDAY" &&
    h.fromTime === "00:00" &&
    (h.toTime === "24:00" || h.toTime === "23:59")
  );
}

function buildHotline(s: EcStation): string | null {
  if (!s.phoneNumber) return null;
  return [s.phoneCountryCode, s.regionCode, s.phoneNumber]
    .filter(Boolean)
    .join(" ");
}

/** Ein E-Control-Ladepunkt → unsere `stations`-Zeile. null wenn keine Koordinaten. */
export function mapPointToStation(
  operator: EcOperator,
  station: EcStation,
  point: EcPoint,
): NewStation | null {
  const lat = point.latitude ?? station.latitude ?? null;
  const lon = point.longitude ?? station.longitude ?? null;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const { isAc, isDc } = classifyElectricity(point.electricityType, point.capacityKw);
  return {
    evseId: point.evseId,
    operatorId: operator.operatorId,
    operatorName: operator.organization ?? null,
    chargingStationId: station.stationId,
    lat,
    lon,
    city: station.city ?? null,
    postalCode: station.postCode ?? null,
    street: station.street ?? null,
    country: station.country ?? COUNTRY,
    nameDe: station.label ?? null,
    plugs: (point.connectorType ?? []).map(mapConnector),
    authModes: point.authenticationMode ?? [],
    maxPowerKw: point.capacityKw ?? station.maxCapacityKw ?? null,
    isAc,
    isDc,
    isOpen24h: isOpen24h(station.openingHours),
    accessibility: null,
    dynamicInfoAvailable: point.status != null,
    renewableEnergy: station.greenEnergy ?? false,
    hotline: buildHotline(station),
    raw: { source: "econtrol-at", operatorId: operator.operatorId, station, point },
  };
}

/** Echtzeit-Status eines Ladepunkts → `station_status`-Zeile. */
export function mapPointToStatus(point: EcPoint): NewStationStatus {
  return { evseId: point.evseId, status: mapStatus(point.status) };
}

// ---- Fetch-Layer ---------------------------------------------------------

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: authHeaders(),
    signal: signal ?? AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`E-Control ${res.status} für ${path}`);
  }
  return (await res.json()) as T;
}

export const fetchOperators = (signal?: AbortSignal) =>
  getJson<EcOperator[]>(`/countries/${COUNTRY}/operators`, signal);

export const fetchStations = (operatorId: string, signal?: AbortSignal) =>
  getJson<EcStation[]>(
    `/countries/${COUNTRY}/operators/${encodeURIComponent(operatorId)}/stations`,
    signal,
  );

export const fetchPoints = (
  operatorId: string,
  stationId: string,
  signal?: AbortSignal,
) =>
  getJson<EcPoint[]>(
    `/countries/${COUNTRY}/operators/${encodeURIComponent(operatorId)}/stations/${encodeURIComponent(stationId)}/points`,
    signal,
  );
