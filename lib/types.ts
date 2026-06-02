import type { PlugFilter } from "./plugs";

export type StationFeatureProperties = {
  evseId: string;
  name: string | null;
  operatorName: string | null;
  maxPowerKw: number | null;
  isAc: boolean;
  isDc: boolean;
  total: number;
  available: number;
  hasStatus: boolean;
};

export type StationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: StationFeatureProperties;
};

export type StationFeatureCollection = {
  type: "FeatureCollection";
  features: StationFeature[];
  truncated: boolean;
};

export type StationPoint = {
  evseId: string;
  maxPowerKw: number | null;
  isAc: boolean;
  isDc: boolean;
  plugs: string[];
  status: string | null;
};

export type StationDetail = {
  evseId: string; // repräsentativer Ladepunkt (für Tarif-Lookup)
  name: string | null;
  operatorName: string | null;
  lat: number;
  lon: number;
  city: string | null;
  postalCode: string | null;
  street: string | null;
  authModes: string[];
  accessibility: string | null;
  renewableEnergy: boolean;
  isOpen24h: boolean;
  hotline: string | null;
  total: number;
  available: number;
  hasStatus: boolean;
  points: StationPoint[];
};

export type Filters = {
  minPower: number;
  current: "any" | "ac" | "dc";
  plugType: PlugFilter;
  favoritesOnly: boolean;
};
