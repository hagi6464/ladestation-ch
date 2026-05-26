/**
 * Kuratierte Eigentarife der wichtigsten CH-Ladesäulenbetreiber.
 *
 * Quelle: Web-Recherche der Anbieter-Websites (Stand: 2026-05). Preise sind
 * approximativ — vor Production-Use auf der jeweiligen `pricingUrl` verifizieren.
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
    tariffs: [
      {
        name: "easycharge Direkttarif",
        requiresMembership: false,
        acPerKwh: 0.45,
        dcPerKwh: 0.59,
        notes:
          "Ad-hoc Laden ohne Abo. Tatsächlicher Preis kann je nach Standort variieren.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "swisscharge",
    displayName: "Swisscharge",
    aliases: ["swisscharge"],
    websiteUrl: "https://swisscharge.ch",
    pricingUrl: "https://swisscharge.ch/de/solutions/ladepreise/",
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
    pricingUrl: "https://gofast.swiss/de/preise/",
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
    pricingUrl: "https://move.ch/de/preise",
    tariffs: [
      {
        name: "MOVE Direkttarif AC",
        requiresMembership: false,
        acPerKwh: 0.45,
      },
      {
        name: "MOVE Direkttarif DC",
        requiresMembership: false,
        dcPerKwh: 0.72,
        notes:
          "Misch-Modell mit Energie- und Zeit-Komponente. ~CHF 36–38 für 50 kWh.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "evpass",
    displayName: "evpass (Shell)",
    aliases: ["evpass", "ev pass", "groupe e"],
    websiteUrl: "https://www.evpass.ch",
    pricingUrl: "https://www.evpass.ch/de/tarife",
    tariffs: [
      {
        name: "evpass Direkttarif",
        requiresMembership: false,
        acPerKwh: 0.55,
        dcPerKwh: 0.89,
        notes:
          "Eher teurer Tarif. ~CHF 46 für 50 kWh. Tankkarten-Abos günstiger.",
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
    tariffs: [
      {
        name: "M-Charge AC",
        requiresMembership: false,
        acPerKwh: 0.39,
      },
      {
        name: "M-Charge DC",
        requiresMembership: false,
        dcPerKwh: 0.55,
        notes: "Über 2'000 Punkte an Migros-Standorten. AC bis 22 kW, DC bis 320 kW.",
      },
    ],
    lastUpdated: "2026-05",
  },
  {
    cpoId: "ionity",
    displayName: "IONITY",
    aliases: ["ionity"],
    websiteUrl: "https://ionity.eu",
    pricingUrl: "https://ionity.eu/de/charging-prices",
    tariffs: [
      {
        name: "IONITY Direkt",
        requiresMembership: false,
        dcPerKwh: 0.79,
        notes: "Ad-hoc Laden bis 350 kW.",
      },
      {
        name: "IONITY Passport Power",
        requiresMembership: true,
        monthlyFeeChf: 17.99,
        dcPerKwh: 0.39,
        notes: "Abo für Vielfahrer auf Autobahn-Hubs.",
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
    tariffs: [
      {
        name: "Tesla-Fahrer",
        requiresMembership: false,
        dcPerKwh: 0.5,
        notes:
          "Preis variiert nach Standort und Tageszeit. ~CHF 25 für 50 kWh.",
      },
      {
        name: "Andere Marken",
        requiresMembership: false,
        dcPerKwh: 0.68,
        notes:
          "Aufschlag für Nicht-Tesla. Mit Supercharger-Membership (CHF 12.90/Monat) günstiger.",
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
    tariffs: [
      {
        name: "Plug'n Roll Direkt",
        requiresMembership: false,
        acPerKwh: 0.52,
        dcPerKwh: 0.76,
        notes: "~CHF 38 für 50 kWh.",
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
    websiteUrl: "https://www.shellrecharge.com/de-ch",
    pricingUrl: "https://www.shellrecharge.com/de-ch/tarife",
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
    pricingUrl: "https://www.allego.eu/de/preise",
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
    pricingUrl: "https://www.ewz.ch/de/private/e-mobilitaet/laden-unterwegs.html",
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
    pricingUrl: "https://www.ewb.ch/strom/elektromobilitaet",
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
