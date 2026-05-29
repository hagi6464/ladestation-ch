/**
 * Prüft die Erreichbarkeit aller pricingUrl-Einträge in lib/cpo-tariffs.ts.
 *
 * Hilft bei der Pflege: identifiziert tote URLs (404, Redirects auf andere
 * Hosts) ohne dass man jede manuell anklicken muss.
 *
 * Bewusst KEINE automatische Preis-Extraktion — Tarif-Tabellen sind oft
 * dynamisch geladen oder hinter Logins. Output ist eine Trigger-Liste für
 * manuelle Recherche.
 *
 * Usage: `pnpm check:cpo-urls`
 * Exit-Code: 0 wenn alle OK, 1 wenn mindestens einer broken.
 */
import { CPO_TARIFFS } from "../lib/cpo-tariffs";

type CheckResult = {
  cpoId: string;
  displayName: string;
  url: string;
  status: number | "timeout" | "error";
  finalUrl?: string;
  durationMs: number;
  note?: string;
};

const TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; LadestationApp-CPO-Check/1.0; +https://ladestation-ch.vercel.app)";

async function check(cpo: (typeof CPO_TARIFFS)[number]): Promise<CheckResult> {
  if (!cpo.pricingUrl) {
    return {
      cpoId: cpo.cpoId,
      displayName: cpo.displayName,
      url: cpo.websiteUrl,
      status: "error",
      durationMs: 0,
      note: "keine pricingUrl gesetzt",
    };
  }

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cpo.pricingUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    const finalUrl = res.url;
    const sameHost =
      new URL(finalUrl).host === new URL(cpo.pricingUrl).host;
    return {
      cpoId: cpo.cpoId,
      displayName: cpo.displayName,
      url: cpo.pricingUrl,
      status: res.status,
      finalUrl: sameHost ? undefined : finalUrl,
      durationMs: Date.now() - start,
      note: sameHost ? undefined : "redirected to other host",
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout =
      err instanceof Error && err.name === "AbortError";
    return {
      cpoId: cpo.cpoId,
      displayName: cpo.displayName,
      url: cpo.pricingUrl,
      status: isTimeout ? "timeout" : "error",
      durationMs: Date.now() - start,
      note: err instanceof Error ? err.message : String(err),
    };
  }
}

function format(r: CheckResult): string {
  const isOk = r.status === 200 && !r.note;
  const icon = isOk ? "OK " : r.status === 200 ? "WARN" : "FAIL";
  const status = String(r.status).padEnd(7);
  const name = r.displayName.padEnd(34);
  const time = `${r.durationMs}ms`.padStart(7);
  const tail = r.note ? `  -- ${r.note}` : "";
  const tail2 = r.finalUrl ? `\n            -> ${r.finalUrl}` : "";
  return `${icon}  ${status}  ${time}  ${name}${tail}${tail2}`;
}

async function main(): Promise<void> {
  console.log(
    `Pruefe ${CPO_TARIFFS.length} CPO-pricingUrl-Eintraege...\n`,
  );
  const results = await Promise.all(CPO_TARIFFS.map(check));

  for (const r of results) {
    console.log(format(r));
  }

  const broken = results.filter(
    (r) => r.status !== 200 || r.note !== undefined,
  );
  const ok = results.length - broken.length;

  console.log(`\nSummary: ${ok}/${results.length} OK, ${broken.length} mit Issues`);
  if (broken.length > 0) {
    console.log("\nIssues:");
    for (const r of broken) {
      console.log(`  - ${r.displayName}: ${r.status} ${r.note ?? ""}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(2);
});
