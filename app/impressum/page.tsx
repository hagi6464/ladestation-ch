import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Impressum — Ladestation Schweiz",
  description:
    "Impressum, Angebot und rechtliche Hinweise der App Ladestation Schweiz.",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-secondary">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
      >
        <IconArrowLeft size={15} />
        Zur Karte
      </Link>

      <h1 className="mt-4 t-large-title text-primary">Impressum</h1>

      <h2 className="mt-8 t-title text-primary">Betreiber</h2>
      <div className="mt-2 space-y-1 text-sm">
        <p>Marek Hagmann</p>
        <p>2540 Grenchen, Schweiz</p>
        <p>
          E-Mail:{" "}
          <a
            href="mailto:ladestation-ch.relock425@passmail.com"
            className="text-brand hover:underline"
          >
            ladestation-ch.relock425@passmail.com
          </a>
        </p>
      </div>

      <h2 className="mt-8 t-title text-primary">Über die App</h2>
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

      <h2 className="mt-8 t-title text-primary">Freiwillige Unterstützung</h2>
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

      <h2 className="mt-8 t-title text-primary">Datenquellen</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Die Ladestationsdaten stammen aus den öffentlich zugänglichen Daten von
        ich-tanke-strom.ch des Bundesamts für Energie (BFE).
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Das Kartenmaterial basiert auf Daten von OpenStreetMap sowie den
        zugehörigen Kartendiensten.
      </p>

      <h2 className="mt-8 t-title text-primary">Haftungsausschluss</h2>
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

      <h2 className="mt-8 t-title text-primary">Datenschutz</h2>
      <p className="mt-2 text-sm leading-relaxed">
        Diese App nutzt Vercel Web Analytics, um anonyme Nutzungsstatistiken (z. B.
        Seitenaufrufe, ungefähre Herkunft, Gerätetyp) zu erfassen. Dieser Dienst
        arbeitet ohne Cookies, ohne geräteübergreifende Wiedererkennung und ohne
        personenbezogene Profile. Darüber hinaus werden keine weiteren
        Tracking-Dienste eingesetzt. Einige Einstellungen — etwa gespeicherte
        Favoriten und der Hinweis, dass die Kurzanleitung bereits angezeigt wurde
        — werden ausschliesslich lokal im Browser (localStorage) gespeichert und
        nicht an Dritte übermittelt.
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        Für die Auslieferung der App und die Anzeige der Karte werden technisch
        notwendige Anfragen an den Hosting-Anbieter sowie an die genannten Karten-
        und Datendienste gestellt; dabei können technische Verbindungsdaten wie
        die IP-Adresse verarbeitet werden. Bei einer Trinkgeld-Zahlung gelten
        zusätzlich die Datenschutzbestimmungen von Payrexx.
      </p>
    </main>
  );
}
