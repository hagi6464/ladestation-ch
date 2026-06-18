/**
 * PoC-Trockenlauf für den französischen IRVE-Adapter.
 *
 * Streamt nur die ERSTEN Zeilen der konsolidierten CSV (Stream wird danach
 * abgebrochen — kein 150-MB-Download), mappt sie und gibt Statistik aus.
 * Schreibt bewusst NICHT in die Datenbank.
 *
 * Nutzung: `pnpm poc:irve-fr`.
 */
import { streamIrve } from "../lib/sources/irve-fr";
import type { NewStation } from "../lib/db/schema";

const MAX_ROWS = 3000;

async function main() {
  const mapped: NewStation[] = [];
  console.log(`[poc-fr] streaming IRVE-CSV (max ${MAX_ROWS} Zeilen) …`);
  const stats = await streamIrve((s) => mapped.push(s), { maxRows: MAX_ROWS });

  const acdc = { ac: 0, dc: 0, both: 0, none: 0 };
  const plugCount: Record<string, number> = {};
  let withCoords = 0;
  let withPower = 0;
  let open24 = 0;
  for (const s of mapped) {
    if (s.isAc && s.isDc) acdc.both++;
    else if (s.isAc) acdc.ac++;
    else if (s.isDc) acdc.dc++;
    else acdc.none++;
    if (Number.isFinite(s.lat) && Number.isFinite(s.lon)) withCoords++;
    if (s.maxPowerKw != null) withPower++;
    if (s.isOpen24h) open24++;
    for (const pl of s.plugs ?? []) plugCount[pl] = (plugCount[pl] ?? 0) + 1;
  }

  console.log("\n===== PoC-Ergebnis FR (Stichprobe, KEIN DB-Write) =====");
  console.log(`Datenzeilen gelesen:   ${stats.dataRows}`);
  console.log(`  gemappt:             ${stats.mapped}`);
  console.log(`  verworfen:           ${stats.skipped}`);
  console.log(`  mit Koordinaten:     ${withCoords}/${mapped.length}`);
  console.log(`  mit Leistung (kW):   ${withPower}/${mapped.length}`);
  console.log(`  24h:                 ${open24}/${mapped.length}`);
  console.log(`AC/DC:                 AC=${acdc.ac} DC=${acdc.dc} beide=${acdc.both} keine=${acdc.none}`);
  console.log(`Stecker:               ${JSON.stringify(plugCount)}`);
  console.log("\n--- Beispiel (gemappte Station) ---");
  console.log(JSON.stringify(mapped[0], null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[poc-fr] fatal:", err);
    process.exit(1);
  });
