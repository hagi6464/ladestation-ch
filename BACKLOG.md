# Backlog — Funktions-Ideen für später

Liste von Features/Ideen, die später angegangen werden können. Pro Eintrag kurz: was, warum, wie ungefähr — damit der Kontext nicht verloren geht.

## Offen

### Donation-Button für den Programmierer (TWINT)
**Warum:** App ist gratis und werbefrei — wer freiwillig unterstützen will, soll einen einfachen Weg haben. Schweiz-Fokus → TWINT ist das natürliche Zahlungsmittel.

**Wie ungefähr:**
- Variante A: **TWINT-Direct via QR-Code**. Eigener TWINT-Geschäftsaccount (oder Privatkonto mit "Geld empfangen"-Link), statischer QR-Code als SVG/PNG ins Repo. Banner/Footer-Button "❤️ Spenden" → Modal mit QR-Code + Hinweis "TWINT-App öffnen, QR scannen". Keine Provision, keine Abhängigkeit von Stripe.
- Variante B: **Stripe Payment-Link "Donate"** (One-Time, beliebiger Betrag). Akzeptiert TWINT + Karte + Apple/Google Pay. Stripe-Gebühren ~3 %. Mehr Reichweite (auch Nicht-CH-Nutzer), aber Stripe-Account nötig.
- Variante C: **Buy Me a Coffee / Ko-fi**-Link. Out-of-the-box Plattform, niedrige Hürde. TWINT nicht direkt, aber Karten-Zahlung global. Plattform-Cut ~5 %.

**Plazierung:** dezent — entweder kleiner Heart-Button im bottom-left Overlay (neben Impressum-Links wenn die zurückkommen) oder am Ende des Detail-Sheets. Nicht aufdringlich, kein Modal-Popup beim Start.

**Aufwand-Schätzung:** Variante A ist ~1 Stunde (QR generieren + Modal-Component). Variante B/C jeweils 2–3 Stunden inklusive Account-Setup.
