import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum — Ladestation Schweiz",
  description:
    "Impressum, Angebot und rechtliche Hinweise der App Ladestation Schweiz.",
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

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Betreiber
      </h2>
      <div className="mt-2 space-y-1 text-sm">
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
      </div>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Über die App
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        „Ladestation Schweiz“ ist eine kostenlose und werbefreie Web-App zur
        Anzeige öffentlicher Elektroauto-Ladestationen in der Schweiz. Die App
        bietet Informationen zu Standorten, Verfügbarkeit sowie einen Vergleich
        der Tarife verschiedener Betreiber.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Das Projekt wird privat und ohne kommerzielle Absichten betrieben. Es
        werden keine Produkte oder Dienstleistungen verkauft.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Freiwillige Unterstützung
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Wer das Projekt unterstützen möchte, kann freiwillig ein Trinkgeld über
        den Button „Trinkgeld senden“ überweisen. Die Zahlung kann per TWINT oder
        Kredit-/Debitkarte erfolgen.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Die Unterstützung ist freiwillig, einmalig und erfolgt ohne
        Gegenleistung. Es besteht weder eine Kaufpflicht noch ein Abonnement oder
        Mitgliedschaftsverhältnis.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Die Zahlungsabwicklung erfolgt durch Payrexx. Es gelten die Datenschutz-
        und Nutzungsbedingungen des jeweiligen Zahlungsdienstleisters.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Datenquellen
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Die Ladestationsdaten stammen aus den öffentlich zugänglichen Daten von
        ich-tanke-strom.ch des Bundesamts für Energie (BFE).
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Das Kartenmaterial basiert auf Daten von OpenStreetMap sowie den
        zugehörigen Kartendiensten.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Haftungsausschluss
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        Die Inhalte dieser App werden mit grösstmöglicher Sorgfalt erstellt und
        aktualisiert. Dennoch kann keine Gewähr für die Richtigkeit,
        Vollständigkeit, Aktualität oder Verfügbarkeit der bereitgestellten
        Informationen übernommen werden.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Insbesondere Angaben zu Verfügbarkeit, Betriebsstatus, technischen
        Eigenschaften, Preisen oder Tarifen von Ladestationen können sich
        jederzeit ändern oder von den tatsächlichen Gegebenheiten abweichen.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Verbindlich sind ausschliesslich die Informationen der jeweiligen
        Ladestationsbetreiber.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Jegliche Haftung für direkte oder indirekte Schäden, die aus der Nutzung
        der bereitgestellten Informationen entstehen, wird im gesetzlich
        zulässigen Umfang ausgeschlossen.
      </p>
    </main>
  );
}
