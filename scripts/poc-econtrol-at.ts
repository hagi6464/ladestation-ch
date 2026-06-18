/**
 * PoC-Trockenlauf für den österreichischen E-Control-Adapter.
 *
 * Fetcht eine BEGRENZTE Stichprobe (operators → stations → points), mappt sie auf
 * unser Schema und gibt Statistik + Beispiele aus. Schreibt bewusst NICHT in die
 * Datenbank — reiner Validierungslauf.
 *
 * Nutzung: `pnpm poc:econtrol-at` (braucht ECONTROL_API_KEY/USER in .env.local).
 */
import {
  fetchOperators,
  fetchStations,
  fetchPoints,
  mapPointToStation,
  mapPointToStatus,
} from "../lib/sources/econtrol-at";
import type { NewStation } from "../lib/db/schema";

const MAX_OPERATORS_SCANNED = 150; // Obergrenze, um die API zu schonen
const MAX_STATIONS_PROCESSED = 60; // genug für eine aussagekräftige Stichprobe

async function main() {
  if (!process.env.ECONTROL_API_KEY && !process.env.ECONTROL_API_USER) {
    throw new Error("ECONTROL_API_KEY/USER fehlt in der Umgebung (.env.local)");
  }
  console.log("[poc] fetching operators …");
  const operators = await fetchOperators();
  console.log(`[poc] operators: ${operators.length}`);

  const mapped: NewStation[] = [];
  const statuses: { evseId: string; status: string }[] = [];
  let stationsProcessed = 0;
  let operatorsScanned = 0;
  let operatorsWithStations = 0;

  for (const op of operators) {
    if (operatorsScanned >= MAX_OPERATORS_SCANNED) break;
    if (stationsProcessed >= MAX_STATIONS_PROCESSED) break;
    operatorsScanned++;
    let stations;
    try {
      stations = await fetchStations(op.operatorId);
    } catch (e) {
      console.warn(`[poc] stations(${op.operatorId}) failed: ${(e as Error).message}`);
      continue;
    }
    if (stations.length === 0) continue;
    operatorsWithStations++;
    for (const st of stations) {
      if (stationsProcessed >= MAX_STATIONS_PROCESSED) break;
      stationsProcessed++;
      let points;
      try {
        points = await fetchPoints(op.operatorId, st.stationId);
      } catch (e) {
        console.warn(`[poc] points(${st.stationId}) failed: ${(e as Error).message}`);
        continue;
      }
      for (const p of points) {
        const s = mapPointToStation(op, st, p);
        if (s) {
          mapped.push(s);
          statuses.push(mapPointToStatus(p));
        }
      }
    }
  }

  // ---- Statistik ----
  const acdc = { ac: 0, dc: 0, both: 0, none: 0 };
  const plugCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  let withCoords = 0;
  let withPower = 0;
  let withStatusLive = 0;
  for (const s of mapped) {
    if (s.isAc && s.isDc) acdc.both++;
    else if (s.isAc) acdc.ac++;
    else if (s.isDc) acdc.dc++;
    else acdc.none++;
    if (Number.isFinite(s.lat) && Number.isFinite(s.lon)) withCoords++;
    if (s.maxPowerKw != null) withPower++;
    if (s.dynamicInfoAvailable) withStatusLive++;
    for (const pl of s.plugs ?? []) plugCount[pl] = (plugCount[pl] ?? 0) + 1;
  }
  for (const st of statuses) statusCount[st.status] = (statusCount[st.status] ?? 0) + 1;

  console.log("\n===== PoC-Ergebnis (Stichprobe, KEIN DB-Write) =====");
  console.log(`Operatoren gescannt:      ${operatorsScanned} (mit Stationen: ${operatorsWithStations})`);
  console.log(`Stationen verarbeitet:    ${stationsProcessed}`);
  console.log(`EVSE-Zeilen gemappt:      ${mapped.length}`);
  console.log(`  mit Koordinaten:        ${withCoords}/${mapped.length}`);
  console.log(`  mit Leistung (kW):      ${withPower}/${mapped.length}`);
  console.log(`  mit Live-Status:        ${withStatusLive}/${mapped.length}`);
  console.log(`AC/DC:                    AC=${acdc.ac} DC=${acdc.dc} beide=${acdc.both} keine=${acdc.none}`);
  console.log(`Stecker:                  ${JSON.stringify(plugCount)}`);
  console.log(`Status (Echtzeit):        ${JSON.stringify(statusCount)}`);
  console.log("\n--- Beispiel (gemappte Station) ---");
  console.log(JSON.stringify(mapped[0], null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[poc] fatal:", err);
    process.exit(1);
  });
