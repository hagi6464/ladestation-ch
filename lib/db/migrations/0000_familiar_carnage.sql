CREATE TABLE "price_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"evse_id" text NOT NULL,
	"kwh" real NOT NULL,
	"minutes" real NOT NULL,
	"response" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_status" (
	"evse_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"evse_id" text PRIMARY KEY NOT NULL,
	"operator_id" text,
	"operator_name" text,
	"charging_station_id" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"city" text,
	"postal_code" text,
	"street" text,
	"country" text,
	"name_de" text,
	"name_fr" text,
	"name_it" text,
	"name_en" text,
	"plugs" text[] DEFAULT '{}' NOT NULL,
	"auth_modes" text[] DEFAULT '{}' NOT NULL,
	"max_power_kw" real,
	"is_ac" boolean DEFAULT false NOT NULL,
	"is_dc" boolean DEFAULT false NOT NULL,
	"is_open_24h" boolean DEFAULT false NOT NULL,
	"accessibility" text,
	"dynamic_info_available" boolean DEFAULT false NOT NULL,
	"renewable_energy" boolean DEFAULT false NOT NULL,
	"hotline" text,
	"raw" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "price_cache_evse_idx" ON "price_cache" USING btree ("evse_id");--> statement-breakpoint
CREATE INDEX "stations_lat_lon_idx" ON "stations" USING btree ("lat","lon");--> statement-breakpoint
CREATE INDEX "stations_operator_idx" ON "stations" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "stations_max_power_idx" ON "stations" USING btree ("max_power_kw");