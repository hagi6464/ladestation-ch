/**
 * Kuratierte Eigentarife der wichtigsten CH-Ladesäulenbetreiber.
 *
 * Quelle: Web-Recherche der Anbieter-Websites. Preise sind approximativ —
 * vor Production-Use auf der jeweiligen `pricingUrl` verifizieren.
 *
 * Stand 2026-05-28: 7 CPOs (energie360, migrol, evpass, move, ionity, tesla,
 * plugnroll) via Web-Recherche verifiziert/aktualisiert. Restliche 8 (swisscharge,
 * gofast, tcs, shellrecharge, enbw, allego, ewz, ewb) konnten nicht öffentlich
 * verifiziert werden (Preise nur in App oder Seite offline) — Werte unverändert
 * seit initial-Befüllung.
 *
 * Pflege: 1-2x pro Jahr durchgehen. Bei Änderung Preis aktualisieren und
 * `lastUpdated` setzen. UI zeigt `lastUpdated` als Vertrauensindikator.
 */

export type CpoTariffEntry = {
  name: string;
  requiresMembership: boolean;
  monthlyFeeChf?: number;
  acPerKwh?: number;
  dcPerKwh?: number;
  blockingFeeChfPerMin?: number;
  blockingStartsAfterMinutes?: number;
  notes?: string;
};

export type CpoTariff = {
  cpoId: string;
  displayName: string;
  aliases: string[];
  websiteUrl: string;
  pricingUrl?: string;
  /**
   * App des Betreibers zum Laden-Starten. Nur gesetzt, wo eine echte Lade-App
   * existiert und die Store-Links verifiziert wurden (Stand 2026-06). Die
   * Store-Seite öffnet die App, falls installiert, sonst die Installation.
   * `name` ist das Button-Label (sonst `displayName`).
   */
  app?: { name?: string; ios?: string; android?: string };
  /**
   * Plattformen ohne einheitlichen Tarif (z. B. eCarUp): Säulenbesitzer setzen
   * Preise individuell. Wenn gesetzt, ersetzt diese Notiz den Standard-Disclaimer
   * und `tariffs` kann leer sein. `headline` und `body` als Info-Block,
   * optionaler `tip` als sanfter Achtung-Hinweis am Ende.
   */
  platformNote?: {
    headline: string;
    body: string;
    tip?: string;
  };
  tariffs: CpoTariffEntry[];
  lastUpdated: string;
};

export const CPO_TARIFFS: CpoTariff[] = [
  {
    cpoId: "energie360",
    displayName: "Energie 360° / easycharge",
    aliases: ["energie 360", "energie360", "easycharge"],
    websiteUrl: "https://www.energie360.ch",
    pricingUrl:
      "https://www.energie360.ch/de/leistungen/mobilitaet/easycharge/",
    app: {
      name: "easycharge",
      ios: "https://apps.apple.com/ch/app/easycharge-energie-360/id1252588156",
      android: "https://play.google.com/store/apps/details?id=cs.energie360",
    },
    tariffs: [
      {
        name: "easycharge Ad-hoc",
        requiresMembership: false,
        acPerKwh: 0.55,
        dcPerKwh: 0.69,
        blockingFeeChfPerMin: 0.25,
        blockingStartsAfterMinutes: 60,
        notes:
          "Direkt-Tarif ohne Registrierung (DC ≥100 kW). DC <100 kW: 0.65/kWh. Mit kostenloser Registrierung günstiger: AC 0.50, DC slow 0.59, DC fast 0.65. Coop-Standorte zusätzlich vergünstigt (AC 0.39).",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "swisscharge",
    displayName: "Swisscharge",
    aliases: ["swisscharge"],
    websiteUrl: "https://swisscharge.ch",
    pricingUrl: "https://swisscharge.ch/de/ladelosungen/ladepreise/",
    app: {
      name: "Swisscharge",
      ios: "https://apps.apple.com/ch/app/swisscharge-your-charging-app/id965094336",
      android: "https://play.google.com/store/apps/details?id=cs.swisscharge",
    },
    tariffs: [
      {
        name: "Swisscharge AC",
        requiresMembership: false,
        acPerKwh: 0.45,
        notes:
          "Pay-per-Use. Roaming intern mit Energie 360° / GOFAST seit Nov 2025 ohne Aufschlag.",
      },
      {
        name: "Swisscharge DC",
        requiresMembership: false,
        dcPerKwh: 0.59,
        blockingFeeChfPerMin: 0.1,
        blockingStartsAfterMinutes: 60,
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "gofast",
    displayName: "GOFAST",
    aliases: ["gofast", "go fast"],
    websiteUrl: "https://gofast.swiss",
    pricingUrl: "https://www.gofast.swiss/schnellladen",
    tariffs: [
      {
        name: "GOFAST Direkttarif",
        requiresMembership: false,
        dcPerKwh: 0.56,
        notes:
          "DC-Schnellladung bis 350 kW an Raststätten. ~CHF 23–30 für 50 kWh.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "move",
    displayName: "MOVE Mobility",
    aliases: ["move mobility", "move.ch", "alpiq move"],
    websiteUrl: "https://move.ch",
    pricingUrl: "https://support.move.ch/help/de-de/22-abonnemente-und-tarife",
    app: {
      name: "MOVE",
      ios: "https://apps.apple.com/ch/app/move-recharge-your-car/id1318630021",
      android: "https://play.google.com/store/apps/details?id=ch.Move.EvApp",
    },
    tariffs: [
      {
        name: "MOVE basic (mit Abo)",
        requiresMembership: true,
        monthlyFeeChf: 4.9,
        acPerKwh: 0.46,
        dcPerKwh: 0.59,
        blockingFeeChfPerMin: 0.25,
        blockingStartsAfterMinutes: 61,
        notes:
          "Grundgebühr CHF 4.90/Monat. Preise gelten im MOVE-Netz. Roaming teurer: AC 0.59 · DC 0.69 + 0.10/min ab 23 kW. Ohne Abo: ad-hoc Direktzahlung via Kreditkarte an MOVE-eigenen Säulen möglich.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "evpass",
    displayName: "evpass (Shell)",
    aliases: ["evpass", "ev pass", "groupe e"],
    websiteUrl: "https://www.evpass.ch",
    pricingUrl: "https://acs.evpass.ch/Pricing",
    app: {
      name: "evpass",
      ios: "https://apps.apple.com/ch/app/evpass/id1084716333",
      android: "https://play.google.com/store/apps/details?id=ch.evpass.evpass",
    },
    tariffs: [
      {
        name: "evpass Direkttarif",
        requiresMembership: false,
        acPerKwh: 0.69,
        dcPerKwh: 0.99,
        notes:
          "Plus Startgebühr CHF 0.99 pro Session. DC ≤80 kW: 0.89/kWh · DC >80 kW: 0.99/kWh. Parkgebühr CHF 0.30/min ab 5 min nach Lade-Ende. Premium-Abo (CHF 20/Mt) deutlich günstiger.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "migrol",
    displayName: "Migrol / M-Charge (Migros)",
    aliases: ["migrol", "migros", "m-charge", "mig "],
    websiteUrl: "https://www.migrol.ch",
    pricingUrl:
      "https://www.migrol.ch/de/rund-ums-fahrzeug/e-ladestationen/oeffentliche-ladestationen/",
    app: {
      name: "M-Charge",
      ios: "https://apps.apple.com/ch/app/m-charge/id6469030309",
      android: "https://play.google.com/store/apps/details?id=ch.migrol.mcharge",
    },
    tariffs: [
      {
        name: "M-Charge AC",
        requiresMembership: false,
        acPerKwh: 0.38,
      },
      {
        name: "M-Charge DC",
        requiresMembership: false,
        dcPerKwh: 0.55,
        notes:
          "DC gestaffelt nach Leistung: <64 kW 0.48 · <200 kW 0.55 · <400 kW 0.59 CHF/kWh. An ausgewählten Migros-Standorten Aktionspreis 0.19/kWh (Mai 2026).",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "ionity",
    displayName: "IONITY",
    aliases: ["ionity"],
    websiteUrl: "https://ionity.eu",
    pricingUrl: "https://support.ionity.eu/faqs/how-much-does-it-cost-to-charge-at-ionity",
    app: {
      name: "IONITY",
      ios: "https://apps.apple.com/ch/app/ionity/id1551448692",
      android:
        "https://play.google.com/store/apps/details?id=com.cleevio.ionity.android.app",
    },
    tariffs: [
      {
        name: "IONITY Direkt",
        requiresMembership: false,
        dcPerKwh: 0.65,
        notes: "Ad-hoc Laden bis 350 kW.",
      },
      {
        name: "IONITY Passport Power",
        requiresMembership: true,
        monthlyFeeChf: 11.5,
        dcPerKwh: 0.46,
        notes: "Abo ~ EUR 11.99/Monat (≈ CHF 11.50). Für Vielfahrer auf Autobahn-Hubs.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "tesla",
    displayName: "Tesla Supercharger",
    aliases: ["tesla"],
    websiteUrl: "https://www.tesla.com/de_CH/supercharger",
    pricingUrl: "https://www.tesla.com/de_CH/findus/list/superchargers/Switzerland",
    app: {
      name: "Tesla",
      ios: "https://apps.apple.com/ch/app/tesla/id582007913",
      android: "https://play.google.com/store/apps/details?id=com.teslamotors.tesla",
    },
    tariffs: [
      {
        name: "Tesla-Fahrer",
        requiresMembership: false,
        dcPerKwh: 0.45,
        notes:
          "Preis variiert nach Standort und Tageszeit: CHF 0.30–0.53/kWh. Off-Peak günstiger.",
      },
      {
        name: "Andere Marken",
        requiresMembership: false,
        dcPerKwh: 0.55,
        notes:
          "Range CHF 0.40–0.73/kWh nach Standort/Tageszeit. Mit Supercharger-Membership ~ EUR 9.99/Monat (≈ CHF 9.50) gilt Tesla-Tarif.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "tcs",
    displayName: "TCS eCharge",
    aliases: ["tcs"],
    websiteUrl: "https://www.tcs.ch",
    pricingUrl: "https://www.tcs.ch/de/produkte/rund-ums-auto/e-charge/",
    app: {
      name: "TCS eCharge",
      ios: "https://apps.apple.com/ch/app/tcs-echarge/id1445571412",
      android: "https://play.google.com/store/apps/details?id=fi.virta.tcs",
    },
    tariffs: [
      {
        name: "TCS eCharge",
        requiresMembership: false,
        acPerKwh: 0.49,
        dcPerKwh: 0.65,
        notes:
          "Roaming-Aggregator. Abrechnung über TCS, Preise je nach Standort.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "plugnroll",
    displayName: "Plug'n Roll (Repower)",
    aliases: ["plug n roll", "plug'n roll", "plug-n-roll", "plugnroll", "repower"],
    websiteUrl: "https://www.plugnroll.com",
    pricingUrl: "https://www.plugnroll.com/de/preise",
    app: {
      name: "Plug'n Roll",
      ios: "https://apps.apple.com/ch/app/plugn-roll/id1122979339",
      android: "https://play.google.com/store/apps/details?id=com.repower.plugnroll",
    },
    tariffs: [
      {
        name: "Plug'n Roll Direkt",
        requiresMembership: false,
        acPerKwh: 0.45,
        dcPerKwh: 0.7,
        notes:
          "Plus Startgebühr CHF 1.50 pro Session. Direktzahlung via Karte/TWINT/PostFinance vor Ort, ohne Abo.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "enbw",
    displayName: "EnBW mobility+",
    aliases: ["enbw"],
    websiteUrl: "https://www.enbw.com/elektromobilitaet",
    pricingUrl: "https://www.enbw.com/elektromobilitaet/produkte/ladetarife",
    app: {
      name: "EnBW mobility+",
      ios: "https://apps.apple.com/ch/app/enbw-mobility-e-auto-laden/id1232210521",
      android: "https://play.google.com/store/apps/details?id=com.enbw.ev",
    },
    tariffs: [
      {
        name: "Standard",
        requiresMembership: false,
        acPerKwh: 0.69,
        dcPerKwh: 0.89,
        notes: "Roaming-Tarif in CH ohne EnBW-Abo. Mit Abo (CHF 5.99/Monat) deutlich günstiger.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "shellrecharge",
    displayName: "Shell Recharge",
    aliases: ["shell recharge", "shell"],
    websiteUrl: "https://www.shell.ch/de_ch/laden.html",
    pricingUrl: "https://www.shell.ch/de_ch/laden/ladetarife-fuer-ihr-elektroauto.html",
    tariffs: [
      {
        name: "Shell Recharge Direkt",
        requiresMembership: false,
        acPerKwh: 0.55,
        dcPerKwh: 0.79,
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "allego",
    displayName: "Allego",
    aliases: ["allego"],
    websiteUrl: "https://www.allego.eu",
    pricingUrl: "https://www.allego.eu/pricing/",
    tariffs: [
      {
        name: "Allego Direkt",
        requiresMembership: false,
        acPerKwh: 0.59,
        dcPerKwh: 0.75,
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "ewz",
    displayName: "EWZ (Elektrizitätswerk Zürich)",
    aliases: ["ewz", "elektrizitätswerk"],
    websiteUrl: "https://www.ewz.ch",
    pricingUrl:
      "https://www.ewz.ch/de/private/elektromobilitaet-privatkunden/unterwegs-laden/unser-ladenetz.html",
    tariffs: [
      {
        name: "EWZ Direkttarif",
        requiresMembership: false,
        acPerKwh: 0.45,
        dcPerKwh: 0.55,
        notes: "Stadt Zürich Netze.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "ecarup",
    displayName: "eCarUp",
    aliases: ["ecarup", "ecar up", "ecar-up"],
    websiteUrl: "https://www.ecarup.com",
    pricingUrl: "https://web.ecarup.com/e-auto-lade-app/",
    app: {
      name: "eCarUp",
      ios: "https://apps.apple.com/ch/app/ecarup/id1235434854",
      android: "https://play.google.com/store/apps/details?id=com.ecarup",
    },
    platformNote: {
      headline: "Privat betriebene Ladesäule",
      body: "eCarUp bietet private Ladesäulen mit oft günstigeren Preisen als grosse Ladenetzwerke. Eigentümer legt Preis fest. Tarifanzeige per App oder QR-Code, Bezahlung ohne Abo via Kreditkarte, Apple Pay oder Google Pay.",
      tip: "Tarif vor dem Start kurz prüfen — er variiert pro Standort.",
    },
    tariffs: [],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "ewb",
    displayName: "Energie Wasser Bern (EWB)",
    aliases: ["energie wasser bern", "ewb", "bernmobil"],
    websiteUrl: "https://www.ewb.ch",
    pricingUrl:
      "https://www.ewb.ch/angebot/energieloesungen/mobilitaet/elektromobilitaet/oeffentliche-ladestationen.php",
    tariffs: [
      {
        name: "EWB Direkttarif",
        requiresMembership: false,
        acPerKwh: 0.45,
        dcPerKwh: 0.55,
        notes: "Stadt Bern Netze.",
      },
    ],
    lastUpdated: "2026-05",
  },
];

const SORTED_CPO_TARIFFS = [...CPO_TARIFFS]
  .map((t) => ({
    cpo: t,
    sortedAliases: [...t.aliases].sort((a, b) => b.length - a.length),
  }))
  .sort(
    (a, b) => b.sortedAliases[0].length - a.sortedAliases[0].length,
  );

export function findCpoTariff(operatorName: string | null): CpoTariff | null {
  if (!operatorName) return null;
  const haystack = operatorName.toLowerCase();
  for (const { cpo, sortedAliases } of SORTED_CPO_TARIFFS) {
    for (const alias of sortedAliases) {
      if (haystack.includes(alias.toLowerCase())) return cpo;
    }
  }
  return null;
}
