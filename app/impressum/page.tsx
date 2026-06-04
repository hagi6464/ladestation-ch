import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum — Ladestation Schweiz",
  description:
    "Impressum, Angebot und Datenschutz der App Ladestation Schweiz.",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-800 dark:text-zinc-200">
      <Link
        href="/"
        className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
      >
        ← Zur Karte
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Impressum
      </h1>

      <section className="mt-6 space-y-1 text-sm">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">Betreiber</p>
        <p>Marek Hagmann</p>
        <p>2540 Grenchen, Schweiz</p>
        <p>
          E-Mail:{" "}
          <a
            href="mailto:ladestation-ch.relock425@passmail.com"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ladestation-ch.relock425@passmail.com
          </a>
        </p>
      </section>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Über die App
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        „Ladestation Schweiz“ ist eine kostenlose, werbefreie Web-App
        (interaktive Karte) mit allen öffentlichen Elektroauto-Ladestationen der
        Schweiz — inklusive Standort, Verfügbarkeit und Vergleich der
        Betreiber-Tarife. Es handelt sich um ein privates, nicht-kommerzielles
        Hobby-Projekt; es werden keine Produkte oder Dienstleistungen verkauft.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Trinkgeld / Unterstützung
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Wer das Projekt freiwillig unterstützen möchte, kann über den Button
        „Trinkgeld senden“ einen frei wählbaren Betrag per TWINT oder Karte
        überweisen (abgewickelt über Payrexx). Die Zahlung ist rein freiwillig,
        einmalig und ohne Gegenleistung — kein Abo, keine Kaufpflicht.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Datenquellen
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Ladestationsdaten: offene Daten des Bundesamts für Energie (BFE,
        ich-tanke-strom.ch). Kartenmaterial: OpenStreetMap / OpenFreeMap.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Haftungsausschluss
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Alle Angaben — insbesondere Verfügbarkeit und Tarife — erfolgen ohne
        Gewähr und können veraltet oder unvollständig sein. Verbindlich sind
        stets die Informationen des jeweiligen Ladestations-Betreibers. Für
        Schäden aus der Nutzung der App wird keine Haftung übernommen.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Datenschutz
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Die App setzt keine Tracking- oder Analyse-Tools ein und sammelt keine
        personenbezogenen Daten. Einige Einstellungen (z. B. Favoriten und der
        Hinweis „Anleitung gesehen“) werden ausschliesslich lokal im Browser
        (localStorage) gespeichert und nicht an Dritte übermittelt. Bei einer
        Trinkgeld-Zahlung gelten zusätzlich die Datenschutzbestimmungen von
        Payrexx.
      </p>

      <p className="mt-10 text-xs text-zinc-500 dark:text-zinc-400">
        Stand: Juni 2026
      </p>
    </main>
  );
}
