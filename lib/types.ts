export type StationFeatureProperties = {
  evseId: string;
  name: string | null;
  operatorName: string | null;
  maxPowerKw: number | null;
  isAc: boolean;
  isDc: boolean;
  status: string | null;
  plugs: string[];
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

export type StationDetail = {
  evseId: string;
  operatorName: string | null;
  chargingStationId: string | null;
  lat: number;
  lon: number;
  city: string | null;
  postalCode: string | null;
  street: string | null;
  nameDe: string | null;
  nameFr: string | null;
  nameEn: string | null;
  plugs: string[];
  authModes: string[];
  maxPowerKw: number | null;
  isAc: boolean;
  isDc: boolean;
  isOpen24h: boolean;
  accessibility: string | null;
  renewableEnergy: boolean;
  hotline: string | null;
  status: string | null;
  statusFetchedAt: string | null;
};

export type Filters = {
  minPower: number;
  current: "any" | "ac" | "dc";
};
