/**
 * open-ev-data-Sync als standalone CLI-Script.
 *
 * Lädt den open-ev-data-Datensatz (MIT, OpenChargingCloud), filtert auf reine
 * BEV mit DC-Lader, mappt auf unsere Vehicle-Form und schreibt den kuratierten
 * Snapshot nach data/ev-data.json (eingecheckt). Bewusst baked-in statt
 * Laufzeit-Fetch: der Datensatz ändert sich selten und ein Fremd-CDN-Fetch bei
 * jeder Nutzung wäre nur ein zusätzlicher Latenz-/Ausfallpunkt.
 *
 * Nutzung: `pnpm sync:ev-data`
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { mapRawToVehicles, type RawEvData } from "../lib/ev-data";

const SOURCES = [
  "https://cdn.jsdelivr.net/gh/OpenChargingCloud/open-ev-data@master/data/ev-data.json",
  "https://raw.githubusercontent.com/OpenChargingCloud/open-ev-data/master/data/ev-data.json",
];

const OUT = join(process.cwd(), "data", "ev-data.json");

async function fetchRaw(): Promise<RawEvData> {
  let lastErr: unknown;
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as RawEvData;
    } catch (err) {
      lastErr = err;
      console.warn(`[sync-ev-data] source failed: ${url} (${err})`);
    }
  }
  throw new Error(`all sources failed: ${lastErr}`);
}

async function main() {
  console.log("[sync-ev-data] fetching open-ev-data...");
  const raw = await fetchRaw();
  const vehicles = mapRawToVehicles(raw);
  if (vehicles.length === 0) {
    throw new Error("no BEV vehicles after mapping — refusing to write");
  }
  writeFileSync(OUT, JSON.stringify(vehicles, null, 2) + "\n", "utf8");
  console.log(
    `[sync-ev-data] wrote ${vehicles.length} vehicles to ${OUT}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sync-ev-data] fatal:", err);
    process.exit(1);
  });
