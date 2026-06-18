/**
 * PoC-Trockenlauf für den deutschen Bundesnetzagentur-Adapter.
 *
 * Löst die aktuelle CSV-URL auf und streamt nur die ERSTEN Zeilen (Stream danach
 * abgebrochen — kein 46-MB-Download), mappt sie und gibt Statistik aus. Schreibt
 * NICHT in die Datenbank.
 *
 * Nutzung: `pnpm poc:bnetza-de`.
 */
import { streamLadesaeulen } from "../lib/sources/bnetza-de";
import type { NewStation } from "../lib/db/schema";

const MAX_ROWS = 3000;

async function main() {
  const mapped: NewStation[] = [];
  console.log(`[poc-de] streaming BNetzA-CSV (max ${MAX_ROWS} Zeilen) …`);
  const stats = await streamLadesaeulen((s) => mapped.push(s), { maxRows: MAX_ROWS });
  console.log(`[poc-de] CSV-URL: ${stats.url}`);

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

  console.log("\n===== PoC-Ergebnis DE (Stichprobe, KEIN DB-Write) =====");
  console.log(`Datenzeilen gelesen:   ${stats.dataRows}`);
  console.log(`  gemappt:             ${stats.mapped}`);
  console.log(`  verworfen:           ${stats.skipped}`);
  console.log(`  mit Koordinaten:     ${withCoords}/${mapped.length}`);
  console.log(`  mit Leistung (kW):   ${withPower}/${mapped.length}`);
  console.log(`  24h:                 ${open24}/${mapped.length}`);
  console.log(`AC/DC:                 AC=${acdc.ac} DC=${acdc.dc} beide=${acdc.both} keine=${acdc.none}`);
  console.log(`Stecker:               ${JSON.stringify(plugCount)}`);
  console.log("\n--- Beispiel (gemappte Station) ---");
  console.log(JSON.stringify(mapped.find((s) => s.isDc) ?? mapped[0], null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[poc-de] fatal:", err);
    process.exit(1);
  });
