import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const stations = pgTable(
  "stations",
  {
    evseId: text("evse_id").primaryKey(),
    operatorId: text("operator_id"),
    operatorName: text("operator_name"),
    chargingStationId: text("charging_station_id"),

    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),

    city: text("city"),
    postalCode: text("postal_code"),
    street: text("street"),
    country: text("country"),

    nameDe: text("name_de"),
    nameFr: text("name_fr"),
    nameIt: text("name_it"),
    nameEn: text("name_en"),

    plugs: text("plugs").array().notNull().default([]),
    authModes: text("auth_modes").array().notNull().default([]),
    maxPowerKw: real("max_power_kw"),
    isAc: boolean("is_ac").notNull().default(false),
    isDc: boolean("is_dc").notNull().default(false),

    isOpen24h: boolean("is_open_24h").notNull().default(false),
    accessibility: text("accessibility"),
    dynamicInfoAvailable: boolean("dynamic_info_available")
      .notNull()
      .default(false),
    renewableEnergy: boolean("renewable_energy").notNull().default(false),
    hotline: text("hotline"),

    raw: jsonb("raw").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("stations_lat_lon_idx").on(t.lat, t.lon),
    index("stations_operator_idx").on(t.operatorId),
    index("stations_max_power_idx").on(t.maxPowerKw),
  ],
);

export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;

export const stationStatus = pgTable("station_status", {
  evseId: text("evse_id").primaryKey(),
  status: text("status").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StationStatus = typeof stationStatus.$inferSelect;
export type NewStationStatus = typeof stationStatus.$inferInsert;
