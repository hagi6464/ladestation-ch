import type { NewStation, NewStationStatus } from "./db/schema";

const STATIC_URL =
  "https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/data/ch.bfe.ladestellen-elektromobilitaet.json";
const STATUS_URL =
  "https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/status/ch.bfe.ladestellen-elektromobilitaet.json";

type LangValue = { lang: string; value: string };

type ChargingFacility = {
  Amperage?: string | null;
  Voltage?: string | null;
  power?: string | null;
  powertype?: string | null;
};

type Address = {
  City?: string | null;
  Country?: string | null;
  PostalCode?: string | null;
  Street?: string | null;
};

type OicpRecord = {
  EvseID: string;
  ChargingStationId?: string | null;
  Address?: Address;
  GeoCoordinates?: { Google?: string | null };
  ChargingFacilities?: ChargingFacility[];
  ChargingStationNames?: LangValue[];
  Plugs?: string[];
  AuthenticationModes?: string[];
  Accessibility?: string | null;
  IsOpen24Hours?: boolean | string | null;
  DynamicInfoAvailable?: boolean | string | null;
  RenewableEnergy?: boolean | null;
  HotlinePhoneNumber?: string | null;
};

type OicpGroup = {
  OperatorID?: string | null;
  OperatorName?: string | null;
  EVSEDataRecord: OicpRecord[];
};

type BfeStaticPayload = { EVSEData: OicpGroup[] };

type OicpStatusRecord = {
  EvseID: string;
  EVSEStatus: string;
};

type OicpStatusGroup = {
  OperatorID?: string | null;
  EVSEStatusRecord: OicpStatusRecord[];
};

type BfeStatusPayload = { EVSEStatuses: OicpStatusGroup[] };

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseGeo(google: string | null | undefined): [number, number] | null {
  if (!google) return null;
  const parts = google.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lat, lon];
}

function maxPower(facilities?: ChargingFacility[]): number | null {
  const list = toArray(facilities);
  if (!list.length) return null;
  let max = 0;
  for (const f of list) {
    const p = Number(f?.power);
    if (Number.isFinite(p) && p > max) max = p;
  }
  return max > 0 ? max : null;
}

function classifyAcDc(facilities?: ChargingFacility[]): {
  isAc: boolean;
  isDc: boolean;
} {
  let isAc = false;
  let isDc = false;
  for (const f of toArray(facilities)) {
    const type = f?.powertype?.toUpperCase() ?? "";
    if (type.startsWith("AC")) isAc = true;
    if (type.startsWith("DC")) isDc = true;
  }
  return { isAc, isDc };
}

function pickName(
  names: LangValue[] | undefined,
  lang: string,
): string | null {
  for (const n of toArray(names)) {
    if (n?.lang === lang && typeof n.value === "string") return n.value;
  }
  return null;
}

function toBool(v: boolean | string | null | undefined): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
}

export function mapRecordToStation(
  group: OicpGroup,
  rec: OicpRecord,
): NewStation | null {
  const coords = parseGeo(rec.GeoCoordinates?.Google);
  if (!coords) return null;
  const [lat, lon] = coords;
  const { isAc, isDc } = classifyAcDc(rec.ChargingFacilities);

  return {
    evseId: rec.EvseID,
    operatorId: group.OperatorID ?? null,
    operatorName: group.OperatorName ?? null,
    chargingStationId: rec.ChargingStationId ?? null,
    lat,
    lon,
    city: rec.Address?.City ?? null,
    postalCode: rec.Address?.PostalCode ?? null,
    street: rec.Address?.Street ?? null,
    country: rec.Address?.Country ?? null,
    nameDe: pickName(rec.ChargingStationNames, "de"),
    nameFr: pickName(rec.ChargingStationNames, "fr"),
    nameIt: pickName(rec.ChargingStationNames, "it"),
    nameEn: pickName(rec.ChargingStationNames, "en"),
    plugs: toArray(rec.Plugs),
    authModes: toArray(rec.AuthenticationModes),
    maxPowerKw: maxPower(rec.ChargingFacilities),
    isAc,
    isDc,
    isOpen24h: toBool(rec.IsOpen24Hours),
    accessibility: rec.Accessibility ?? null,
    dynamicInfoAvailable: toBool(rec.DynamicInfoAvailable),
    renewableEnergy: rec.RenewableEnergy === true,
    hotline: rec.HotlinePhoneNumber ?? null,
    raw: rec as unknown as Record<string, unknown>,
  };
}

const BFE_HEADERS = {
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate, br",
  "User-Agent":
    "Mozilla/5.0 (compatible; ladestation-app/0.1; +https://github.com/SFOE/ichtankestrom_Documentation)",
};

async function fetchWithRetry(url: string, attempts = 3): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: BFE_HEADERS,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[bfe] fetch attempt ${i + 1}/${attempts} failed: ${msg}`,
      );
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

export async function fetchStaticData(): Promise<BfeStaticPayload> {
  return (await fetchWithRetry(STATIC_URL)) as BfeStaticPayload;
}

export async function fetchStatusData(): Promise<BfeStatusPayload> {
  return (await fetchWithRetry(STATUS_URL)) as BfeStatusPayload;
}

export function extractStations(payload: BfeStaticPayload): NewStation[] {
  const out: NewStation[] = [];
  for (const group of toArray(payload?.EVSEData)) {
    for (const rec of toArray(group?.EVSEDataRecord)) {
      if (!rec?.EvseID) continue;
      try {
        const mapped = mapRecordToStation(group, rec);
        if (mapped) out.push(mapped);
      } catch (err) {
        console.warn(`Skipping ${rec.EvseID}:`, err);
      }
    }
  }
  return out;
}

export function extractStatus(
  payload: BfeStatusPayload,
): NewStationStatus[] {
  const out: NewStationStatus[] = [];
  for (const group of toArray(payload?.EVSEStatuses)) {
    for (const rec of toArray(group?.EVSEStatusRecord)) {
      if (!rec?.EvseID) continue;
      out.push({ evseId: rec.EvseID, status: rec.EVSEStatus });
    }
  }
  return out;
}
