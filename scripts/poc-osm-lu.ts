/**
 * PoC-Trockenlauf für den Luxemburg-Adapter (OSM/Overpass).
 *
 * Holt ALLE LU-Ladestationen (klein, ~1k), mappt sie und gibt Statistik aus.
 * Schreibt NICHT in die Datenbank.
 *
 * Nutzung: `pnpm poc:osm-lu`.
 */
import { fetchOverpass, mapElements } from "../lib/sources/osm-lu";

async function main() {
  console.log("[poc-lu] querying Overpass …");
  const elements = await fetchOverpass();
  console.log(`[poc-lu] rohe OSM-Elemente: ${elements.length}`);
  const mapped = mapElements(elements);

  const acdc = { ac: 0, dc: 0, both: 0, none: 0 };
  const plugCount: Record<string, number> = {};
  let withPower = 0;
  let open24 = 0;
  const operators = new Set<string>();
  for (const s of mapped) {
    if (s.isAc && s.isDc) acdc.both++;
    else if (s.isAc) acdc.ac++;
    else if (s.isDc) acdc.dc++;
    else acdc.none++;
    if (s.maxPowerKw != null) withPower++;
    if (s.isOpen24h) open24++;
    if (s.operatorName) operators.add(s.operatorName);
    for (const pl of s.plugs ?? []) plugCount[pl] = (plugCount[pl] ?? 0) + 1;
  }

  console.log("\n===== PoC-Ergebnis LU (KEIN DB-Write) =====");
  console.log(`gemappte Stationen:    ${mapped.length}`);
  console.log(`  mit Leistung (kW):   ${withPower}/${mapped.length}`);
  console.log(`  24h:                 ${open24}/${mapped.length}`);
  console.log(`AC/DC:                 AC=${acdc.ac} DC=${acdc.dc} beide=${acdc.both} keine=${acdc.none}`);
  console.log(`Stecker:               ${JSON.stringify(plugCount)}`);
  console.log(`Betreiber (Top):       ${[...operators].slice(0, 8).join(", ")}`);
  console.log("\n--- Beispiel (SuperChargy, falls vorhanden) ---");
  const ex = mapped.find((s) => s.isDc) ?? mapped[0];
  console.log(JSON.stringify(ex, null, 1));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[poc-lu] fatal:", err);
    process.exit(1);
  });
