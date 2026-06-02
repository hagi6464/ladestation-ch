# Backlog — Funktions-Ideen & zurückgestellte Tasks

Liste von Features/Ideen für später. Pro Eintrag: was, warum, Aufwand-Schätzung. Damit zukünftiges-Ich (oder ein neuer Mitstreiter) den Kontext nicht erst rekonstruieren muss.

---

## 🎯 Nächste Session — Block 1–4 (geplant am 2026-05-29)

In einem Schwung umsetzen (~3 h total):

1. **CPO-URLs reparieren** (30 Min) — 5 echte 404/Redirect-Fixes: Swisscharge, MOVE, GOFAST, Shell Recharge, EWZ, EWB. Via WebSearch neue Tarif-Seiten finden, in `lib/cpo-tariffs.ts` aktualisieren. Danach `pnpm check:cpo-urls` zur Verifikation.
2. **Stecker-Typ-Filter** (1 h) — `Filters` um `plugType?: "type2" | "ccs" | "chademo"` erweitern. Backend `app/api/stations/route.ts` filtert per Postgres Array-Operator auf `stations.plugs`. UI in `components/FilterBar.tsx` mit Plug-Type-Buttons.
3. **Sortierung "günstigste zuerst"** (30 Min) — im Detail-Sheet (`components/StationSheet.tsx`), Funktion `PointsList`: sortiere nach `dcPerKwh ?? acPerKwh` aufsteigend. Bonus: kleines "günstigste"-Badge am ersten Eintrag.
4. **Donation TWINT-QR** (1 h) — Variante A aus dem Backlog. Voraussetzung: User hat TWINT-QR-Code als PNG/SVG zur Hand. Neue `components/DonationButton.tsx` + `components/DonationModal.tsx`, klein im bottom-left Overlay neben Logo.

**Erwartetes Ergebnis nach dem Block:** spürbar bessere Datenqualität + direkter UX-Wert (Filter + Sortierung) + Spendenkanal aktiv. Push als ein Commit.

---

## Pflege & Wartung

### CPO-URLs aus dem Pflege-Routine-Lauf reparieren
**Status:** `pnpm check:cpo-urls` zeigt 5 echte Issues (FAIL/Redirect) und 3 Fehlalarme (Anti-Bot blockt Node-fetch).

**Echt zu reparieren:**
- Swisscharge — 404, neue URL via WebSearch finden
- MOVE Mobility — 404, neue URL finden
- GOFAST — redirected auf Login, evtl. `gofast.swiss/faq` als Ersatz
- Shell Recharge — redirected auf `shell.com`-Hauptseite, korrekte CH-URL finden
- EWZ + EWB — beide 404, neue URLs finden

**Aufwand:** ~30 Min via WebSearch + Edit pro CPO.

### check:cpo-urls Script verbessern
**Warum:** aktuell werden 403/fetch-failed (Tesla, evpass, Plug'n Roll) als FAIL gewertet — sind aber im Browser völlig OK, nur Server-Bot-Block.

**Wie:** Status `bot-blocked` einführen, Browser-ähnlicher User-Agent + Accept-Language Header, optional HEAD-Request fallback. Wenn `bot-blocked` → als "Skip" werten, kein Exit-Code-1.

**Aufwand:** ~30 Min.

### 8 nicht-verifizierte CPOs durchpflegen
**Status:** swisscharge, gofast, tcs, shellrecharge, enbw, allego, ewz, ewb — Preise sind nur in den jeweiligen Apps sichtbar.

**Wie:** Pro CPO App installieren, in CH lokalisieren, Preise abschreiben, in `lib/cpo-tariffs.ts` eintragen. Manueller Vorgang.

**Aufwand:** ~1.5 h für alle 8.

---

## UX / Polish

### Stecker-Typ-Filter
**Warum:** User mit CCS-Auto interessiert sich nicht für CHAdeMO-Säulen. Aktuelle Filter sind nur AC/DC + kW.

**Wie:** Filters um `plugType?: "type2" | "ccs" | "chademo"` erweitern. Backend filtert per `s.plugs && '{<type>}'`-Array-Operator (Postgres). FilterBar bekommt Plug-Type-Icon-Buttons.

**Aufwand:** ~1 h.

### Sortierung "Günstigste zuerst" in der Karten-Liste
**Warum:** wenn der User mehrere Säulen am gleichen Ort sieht, soll er die günstigste schnell finden.

**Wie:** Im Detail-Sheet bei mehreren Ladepunkten — sortiere `PointsList` nach `dcPerKwh ?? acPerKwh` aufsteigend. Bonus: kleines "günstigste"-Label am ersten Eintrag.

**Aufwand:** ~30 Min.

### Mobile-Sheet UX-Feinheiten + Lighthouse-Polish (Phase 4.2 alt)
**Warum:** Mobile-Layout ist passabel, aber:
- Bottom-Sheet könnte swipe-to-close haben
- Sheet-Header sticky machen (Scroll-Verhalten)
- Tap-Highlights entfernen
- Lighthouse-Score Mobile <90 vermutlich verbesserungswürdig

**Aufwand:** ~2-3 h, je nach Detail-Tiefe.

### Strom-Mix prominenter darstellen
**Warum:** EV-Fahrer interessieren sich für die Energiequelle. `renewableEnergy: true` wird aktuell nur als kleines Badge gezeigt — könnte prominenter sein bei tatsächlich nachweisbar erneuerbaren Säulen.

**Wie:** wenn `renewableEnergy === true` → grünes "🌱 100% erneuerbar"-Badge prominenter (Header statt nur in den Status-Pillen).

**Aufwand:** ~20 Min.

### Web-Share-API: Säule teilen
**Warum:** "Schau, diese Säule hier..." per WhatsApp/SMS einfach teilen.

**Wie:** Im Detail-Sheet Share-Button (`navigator.share()`), shared Link `?fly=lat,lon&open=evseId`. App liest beim Start die Query-Params und navigiert + öffnet automatisch.

**Aufwand:** ~1 h.

### History: letzte 5 besuchte Säulen
**Warum:** wer öfters die App nutzt, hat wiederkehrende Stationen.

**Wie:** localStorage `ladestation-history` (Array max 5 evseIds, FIFO). Im Filter-Bar-Bereich kleiner Dropdown "Zuletzt besucht ▾".

**Aufwand:** ~1 h.

---

## Daten & Auswertung

### Reichweiten-Filter
**Warum:** Säulen sind nur dann interessant, wenn ich sie mit meinem aktuellen Akku-Stand erreiche.

**Wie:** UI: Eingabe "Verbleibende Reichweite km". Karte zeigt Kreis-Overlay um User-Standort (`navigator.geolocation`) mit Radius. Säulen ausserhalb werden ausgegraut.

**Aufwand:** ~3 h.

### Lade-Statistik pro CPO
**Warum:** Übersicht "Migrol hat 482 Säulen, davon 78% gerade frei" wäre informativ.

**Wie:** neue Route `/stats` mit serverseitiger Aggregation aus stations + station_status. Tabelle pro Operator.

**Aufwand:** ~2 h.

---

## Monetarisierung

### Donation-Button (TWINT)
**Warum:** App ist gratis und werbefrei — wer freiwillig unterstützen will, soll einen einfachen Weg haben.

**Wie ungefähr:**
- Variante A: **TWINT-QR-Code direkt** (eigener Geschäfts-/Privataccount). Footer-Button "❤️ Spenden" → Modal mit QR. Keine Provision.
- Variante B: **Stripe Payment-Link "Donate"** — One-Time, beliebiger Betrag, akzeptiert TWINT + Karte + Apple/Google Pay. Stripe-Gebühren ~3 %.
- Variante C: **Buy Me a Coffee / Ko-fi**-Link.

**Aufwand:** Variante A ~1 h, B/C je 2-3 h inkl. Account-Setup.

### Display-Ads / Affiliate
**Status:** in einer früheren Iteration komplett gebaut (Phase 6.1–6.5: Affiliate-Section, Consent-Banner, Pro-Abo mit Stripe TWINT), dann wieder verworfen + zurückgerollt (siehe Plan-File). Code liegt in der Git-History.

**Trigger zur Wiederbelebung:** >5'000 monthly active users. Bis dahin reine Donation-Strategie.

---

## Tech / Infra

### Echter Offline-Modus
**Warum:** PWA ist installiert, aber ohne Internet kommt nix. Karten-Tiles + zuletzt geladene Stationen offline cachen wäre praktisch (Tunnel-Fahrt, schlechtes Netz).

**Wie:** Service Worker erweitern (aktuell ist er minimal). Strategie: cache-first für `/icon.svg`, `/manifest.webmanifest`, Tile-URLs; network-first für `/api/*` mit Stale-While-Revalidate-Fallback. Versionierung beachten.

**Aufwand:** ~3-4 h, plus Test-Sessions ohne Netz.

### Push-Notifications: "Lieblings-Säule wieder frei"
**Warum:** User hat Favoriten — Push wenn eine besetzte favorisierte Säule wieder verfügbar wird.

**Wie:** Web Push API + Backend-Logic (Vergleich neuer Status zu altem, wenn relevant → Push an Subscriber). Braucht VAPID-Keys, Push-Subscriptions in DB, neue Cron-Logic.

**Aufwand:** ~6-8 h, weil viele Bewegliche Teile (Permissions, Service Worker erweitern, Backend-Cron).

### Internationalisierung
**Warum:** Schweiz hat 4 Landessprachen, deutsch deckt ~65% ab. Für FR/IT-CH-Touristen und EN für ausländische Touristen wäre Mehrsprachigkeit relevant.

**Wie:** `next-intl` oder eigene minimale i18n. Übersetzungs-Dateien `messages/de.json`, `messages/fr.json`, `messages/it.json`, `messages/en.json`. Route-Prefix `/de`, `/fr`, `/it`, `/en`.

**Aufwand:** ~4-6 h Setup + jeweils ~2 h pro zusätzliche Sprache.

---

## Sortier-Hinweis

Wenn unklar was als Nächstes — Vorschlag nach **Nutzen/Aufwand**:

1. **CPO-URLs reparieren** (30 Min, sofortige Datenqualität ↑)
2. **Stecker-Typ-Filter** (1 h, direkter User-Wunsch)
3. **Sortierung "günstigste zuerst"** (30 Min, hilft bei Multi-EVSE-Standorten)
4. **Donation-Button A (TWINT-QR)** (1 h, wenn schon ein TWINT-Empfangskonto da ist)
5. **8 CPOs durchpflegen** (1.5 h, Datenqualität-Boost)

Alles darüber hinaus sind Mehrtages-Projekte (PWA-Offline, Push, i18n).
