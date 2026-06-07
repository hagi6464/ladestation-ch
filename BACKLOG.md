# Backlog — Funktions-Ideen & zurückgestellte Tasks

Liste von Features/Ideen für später. Pro Eintrag: was, warum, Aufwand-Schätzung. Damit zukünftiges-Ich (oder ein neuer Mitstreiter) den Kontext nicht erst rekonstruieren muss.

---

## 🎯 Nächste Session — Block 1–4 (geplant am 2026-05-29)

In einem Schwung umsetzen (~3 h total):

1. ✅ **CPO-URLs reparieren** (erledigt 2026-06-02) — 7 tote URLs gefixt (Swisscharge, GOFAST, MOVE, Shell Recharge, Allego, EWZ, EWB). `check:cpo-urls` jetzt 13/16 OK (Rest = Anti-Bot-Fehlalarme).
2. ✅ **Stecker-Typ-Filter** (erledigt 2026-06-02) — `Filters.plugType` (any/type2/ccs/chademo), Backend filtert per `unnest(s.plugs)` + Substring-`LIKE` (rohe OICP-Namen, kein exakter Overlap), UI-Buttons mit Plug-Icons in `FilterBar`. Taxonomie zentral in `lib/plugs.ts`. Real getestet: type2=374, ccs=96, chademo=41 von 428 (Zürich-bbox).
3. ⏸ **Sortierung "günstigste zuerst"** — **auf unbestimmte Zeit verschoben** (2026-06-02). Wörtlich nicht umsetzbar: Preis hängt am Betreiber (`findCpoTariff(operatorName)`), nicht am Ladepunkt — alle Punkte einer Säule haben denselben Tarif, also nichts zu sortieren. Und "günstigste per kWh" würde irreführen (Startgebühr/Blockiergebühr/Abo nicht eingerechnet, 8/16 CPOs unverifiziert). Echte Kostenübersicht braucht zuerst Datenqualität + einen Session-Schätzer → siehe Abschnitt "Kosten-Übersicht / Session-Schätzer" unten.
4. ✅ **Trinkgeld** (erledigt 2026-06-04) — statischer TWINT-QR online nicht erlaubt (TWINT-Vorgabe) → stattdessen **Payrexx-Link** (TWINT + Karte) via Logo-Menü „❤️ Trinkgeld senden" → `DonationModal` (neuer Tab). Echte Payrexx-URL eingesetzt, live. Payrexx verlangte zur Freischaltung zusätzlich **Impressum** (→ `/impressum`) + Angebotsbeschreibung — beides 2026-06-04 erstellt.

**Zwischendrin erledigt (2026-06-02):** ✅ Kurz-Onboarding-Anleitung (`GuideModal`) + Logo-Menü (`LogoMenu`: Anleitung / Als App speichern). Anleitung öffnet beim Erststart einmalig automatisch (`localStorage["ladestation-guide-seen"]`), danach per Logo. Install-Toast dadurch ersetzt/entfernt.

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

### Reiseplaner-Eingaben: iOS-Auto-Zoom verhindern + Drehrad-Auswahl
**Status:** Todo 2026-06-07 (beim iPhone-Test gefunden).

**Problem:** Beim Antippen von „Verbrauch" / „Ankunft mit" (`<input type="number">` in `TripPlanner.tsx`) zoomt iOS Safari automatisch rein.

**Ursache:** iOS zoomt auf Eingabefelder mit Schriftgröße < 16px.

**Wie:**
- **Auto-Zoom verhindern:** Eingaben auf Schriftgröße **≥ 16px** setzen (`text-base` / `text-[16px]`). **Kein** `maximum-scale=1` im Viewport (würde Pinch-Zoom global deaktivieren → schlecht für Accessibility).
- **„Drehrad":** Zahleneingaben auf `<select>` umstellen (rendert auf iOS als nativer Picker/Drehrad) mit diskreten Optionen:
  - **Verbrauch** 10–40 kWh/100km (Schritt 1, ggf. 0.5)
  - **Ankunft mit** 15–80 % am Ziel (Schritt 5)
- **Zu klären:** „alle Eingaben" — soll auch der Ladezustand-Slider (Range) auf Select/Drehrad umgestellt werden? (hat aktuell kein Zoom-Problem.)

**Aufwand:** ~30–45 Min.

### Reiseplaner als Vollbild-Overlay
**Status:** Idee 2026-06-07. Der Reiseplaner ist aktuell ein Bottom-Sheet / seitliches Panel (`TripPlanner.tsx`, `<aside>`), das Karte und andere Bedienelemente nur teilweise überdeckt.

**Warum:** Im Planungsmodus braucht es Fokus; Such-/Filterleiste und Logo-Menü daneben lenken ab.

**Wie:** `TripPlanner` im offenen Zustand als **Vollfenster-Overlay** rendern (z. B. `fixed inset-0`, hoher z-index), das die übrigen Menüs (SearchBox, FilterBar, LogoMenu) verdeckt — entweder per höherem z-index oder indem die Top-Leiste bei `tripOpen` ausgeblendet wird. Schliessen-Button bleibt; Karte ggf. weiterhin im Hintergrund/als eigener Bereich sichtbar.

**Aufwand:** ~1 h (Layout/z-index + Top-Leiste bei `tripOpen` ausblenden).

### Kurzanleitung mit allen Funktionen aktualisieren (+ evtl. Untermenüs)
**Status:** Idee 2026-06-07. Die `GuideModal`-Kurzanleitung deckt noch nicht alle Funktionen ab — u. a. Reiseplaner (inkl. Autobahn-Filter / Ankunfts-Ladestand / Lade-Position), Reichweiten-Filter, Säule teilen, Anbieter-App-Button, GPS-Standort-Marker, Trinkgeld.

**Warum:** Mit wachsendem Funktionsumfang wird eine flache Anleitung schnell unübersichtlich.

**Wie:** Anleitung pro Funktion gliedern; statt einer langen Liste evtl. **Untermenüs / Akkordeon je Funktion** (ein-/ausklappbar), damit es übersichtlich bleibt. Inhalte aus CHANGELOG.md ableiten und aktuell halten.

**Aufwand:** ~1–2 h (Inhalte + Akkordeon-UI).

### App des Betreibers öffnen / Laden starten  ⭐ (Idee 2026-06-02) — ✅ teil-erledigt 2026-06-04
**Erledigt (2026-06-04):** „📱 App öffnen"-Button im Detail-Sheet, wenn der Betreiber eine verifizierte Lade-App hat. `CpoTariff.app = { name, ios, android }` für **11 CPOs** kuratiert (easycharge/Energie 360°, Swisscharge, MOVE, evpass, M-Charge/Migrol, IONITY, Tesla, TCS eCharge, Plug'n Roll, EnBW, eCarUp). Plattform-Erkennung via `pickStoreUrl` in `StationSheet` (iOS→App Store, Android→Play Store, Desktop→Store-Webseite). Öffnet die **Store-Seite** (startet die installierte App bzw. bietet die Installation) — bewusst **kein** Auto-Session-Start.

**Noch offen:** echter „Session an EVSE X starten"-Deep-Link (nur wo ein CPO ihn öffentlich anbietet — selten); App-Links für GOFAST / Shell Recharge / Allego / EWZ / EWB (keine eigenständige CH-App verifizierbar bzw. in Sammel-App migriert).

**Warum:** Schliesst die Lücke von „Säule finden" → „tatsächlich laden". Aus dem Detail-Sheet heraus die passende Lade-App des Betreibers öffnen bzw. den Ladevorgang anstossen.

**Tücken / zu klären:**
- **Deep-Links sind selten öffentlich:** Die wenigsten CPO-Apps (Swisscharge, MOVE, GOFAST, evpass, Shell Recharge …) haben dokumentierte URL-Schemes / Universal Links zum „Laden an EVSE X starten". Realistisch ist meist nur „App öffnen", nicht „Session direkt starten".
- **Fallback-Kette nötig:** App per Scheme/Universal-Link öffnen → wenn nicht installiert → App-/Play-Store-Seite → sonst Betreiber-Website.
- **Roaming:** User lädt evtl. mit einer Roaming-App (z. B. MOVE-Abo an GOFAST-Säule), nicht mit der Betreiber-eigenen App. „Die eine richtige App" gibt es also nicht immer — ggf. Betreiber-App anbieten + Hinweis, dass Roaming-Apps auch gehen.
- **Ad-hoc ohne App:** Viele CH-Säulen erlauben Ad-hoc-Zahlung per QR/Web-Link oder Kartenterminal — falls eine Ad-hoc-URL vorliegt, ist das der app-freie Weg.

**Wie (realistischer MVP):**
- `CpoTariff` (`lib/cpo-tariffs.ts`) um Felder erweitern: `appStore?: { ios?: string; android?: string }`, optional `appScheme?` / `deepLinkTemplate?`, optional `adhocUrl?`. Pro CPO kuratieren.
- Im Detail-Sheet Button „Laden-App öffnen": Plattform erkennen (iOS/Android), Scheme versuchen, sonst Store-Link, sonst Website. Desktop: nur Website/Store-Hinweis.
- Store-/Scheme-Links manuell recherchieren (wie die CPO-Tarife) — per OICP/BFE nicht verfügbar.

**Aufwand:** Grundgerüst ~2–3 h; der eigentliche Aufwand ist die laufende Pflege der App-/Store-Links pro CPO. Echte „Session starten"-Deep-Links nur dort, wo der CPO sie öffentlich anbietet.

### Ladevorgang direkt an Betreiber-App übergeben (Deep-Link zur konkreten Säule)
**Status:** Todo 2026-06-07. Vertieft den „noch offenen" Teil von „App des Betreibers öffnen / Laden starten" (siehe oben): der Button öffnet aktuell nur die Store-/App-Seite, nicht die konkrete Säule.

**Warum:** Lücke „Säule gefunden → tatsächlich laden" schließen — idealerweise öffnet die Betreiber-App direkt den richtigen Ladepunkt (EVSE-ID).

**Wie:** Pro relevantem CPO prüfen, ob ein öffentlicher Deep-Link / URL-Scheme / Universal Link zum „Laden an EVSE X" existiert — dazu die **Betreiber-APIs bzw. App-Dokumentation prüfen** (Swisscharge, MOVE, evpass, IONITY, Tesla, M-Charge, Plug'n Roll, EnBW, eCarUp …). Wo vorhanden: Feld `deepLinkTemplate` in `lib/cpo-tariffs.ts` ergänzen und im `StationSheet` mit der EVSE-ID füllen (mit Fallback-Kette App→Store→Website wie heute).

**Tücken:** Solche Deep-Links sind selten öffentlich dokumentiert; Roaming (User lädt mit anderer App als der Betreiber-App) macht „die eine richtige App" unsicher. Ergebnis der Recherche also offen.

**Aufwand:** Recherche ~2–3 h (pro CPO API/Doku prüfen); Umsetzung je nach Trefferzahl.

### Standort-Marker auf der Karte — ✅ erledigt 2026-06-04
**Erledigt:** Der bestehende 📍-Button (Suchleiste) setzt zusätzlich einen blauen Standort-Punkt + transluzenten Genauigkeitskreis. `SearchBox.onUserLocation` → `page.userLocation` → `Map` (`maplibregl.Marker` mit `animate-ping`-Punkt + GeoJSON-Fill-Layer; `accuracyCircle()`-Polygon skaliert metergenau mit dem Zoom). Kein zweiter Button, kein Live-Tracking (aktualisiert bei jedem Antippen).

**Baustein für:** den **Reichweiten-Filter** (Abschnitt „Daten & Auswertung") — der braucht denselben Standort + ein Kreis-Overlay und kann darauf aufsetzen.

### Stecker-Typ-Filter
**Warum:** User mit CCS-Auto interessiert sich nicht für CHAdeMO-Säulen. Aktuelle Filter sind nur AC/DC + kW.

**Wie:** Filters um `plugType?: "type2" | "ccs" | "chademo"` erweitern. Backend filtert per `s.plugs && '{<type>}'`-Array-Operator (Postgres). FilterBar bekommt Plug-Type-Icon-Buttons.

**Aufwand:** ~1 h.

### Kosten-Übersicht / Session-Schätzer (ersetzt "Günstigste zuerst", verschoben)
**Warum:** Der User soll vor dem Hinfahren abschätzen können, was *ihn* das Laden hier kostet.

**Erkenntnis (2026-06-02):** Die ursprüngliche Idee "PointsList nach `dcPerKwh ?? acPerKwh` sortieren" ist sinnlos — Tarife hängen am Betreiber (`findCpoTariff(operatorName)`), nicht am Ladepunkt; alle Punkte einer Säule teilen denselben Tarif. Eine einzelne kWh-Zahl als "günstigste" würde zudem irreführen (Startgebühr & Leistungsstaffelung stecken nur im Freitext-`notes`, Blockiergebühr/Abo nicht eingerechnet, 8/16 CPOs unverifiziert).

**Wie (richtig):** Session-Schätzer im Detail-Sheet — "Was kostet das Laden hier?" mit wählbarer kWh-Menge, getrennt für günstigsten AC-/DC-Tarif, ehrliche CHF-Schätzung mit sichtbaren Annahmen (ad-hoc, ohne Abo) + Vorbehalt für nicht eingerechnete Gebühren. Voraussetzung für saubere Zahlen: **Datenqualität zuerst** (Startgebühr/`sessionFeeChf` strukturieren, DC-Leistungsstaffelung als Feld, 8 CPOs verifizieren).

**Aufwand:** Schätzer ~2 h, plus Datenmodell-Erweiterung + CPO-Pflege ~2–3 h.

**Echtes "günstigste zuerst"** (Cross-Station-Preisvergleich auf der Karte) ist ein separates, größeres Feature — durch dieselbe Datenlücke blockiert.

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

## Analytics, Feedback & Wachstum (niedrige Prio)

Ideen rund um Nutzungsmessung, Feedback und Reichweite. Bewusst niedrige Prio.

### 1. Bewertungs-/Feedback-System
**Warum:** Ohne App-Store (PWA/Web) gibt es keine Store-Reviews — ein Feedback-Kanal müsste selbst gebaut werden.
**Recherche/Optionen:**
- In-App: kleines Sterne-/Daumen-Widget + optionales Kommentarfeld → in Postgres speichern (`feedback`-Tabelle). Volle Kontrolle, kein Drittanbieter.
- Extern/leichtgewichtig: Google Form / Tally verlinken, oder Feedback-Tool (Canny, Featurebase) einbetten.
- Öffentliches „Rating" (wie Store-Sterne) ist heikel ohne Login (Mehrfach-Abstimmen, Abuse) — eher internes Feedback als öffentliches Rating.
**Aufwand:** In-App-Feedback einfach ~2–3 h; öffentliches Rating-System deutlich mehr.

### 2. Benutzer-Counter / Besucherzahlen
**Frage „sehe ich das auf Vercel?" → Ja:** **Vercel Web Analytics** zeigt Besucher, Page-Views, Referrer, Geräte, Länder (datenschutzfreundlich, ohne Cookies). Auf dem **Hobby-Abo verfügbar, aber mit Event-Limit pro Monat**. Aktivieren: Paket `@vercel/analytics` + `<Analytics/>` im Layout + im Dashboard einschalten.
**Eigener Counter** nur nötig für eine präzise/öffentliche Live-Zahl → kleiner Postgres-Zähler. Sonst reicht Vercel Analytics.
**Aufwand:** Vercel Analytics ~15 Min; eigener Counter ~1 h.

### 3. Wiederkehrende Geräte erkennen?
**Mit der jetzigen Umgebung begrenzt ja:**
- Einfachster Weg: anonyme ID (UUID) im `localStorage` beim Erstbesuch → „neu vs. wiederkehrend" pro Browser-Profil; optional an Postgres loggen.
- Grenzen: zählt pro Browser/Profil, nicht echtes Gerät; reset bei Storage-Löschen / Inkognito / anderem Browser.
- **Device-Fingerprinting** (Canvas/UA) wäre geräte-näher, ist aber datenschutzinvasiv, fragil und passt **nicht** zur werbefrei-/Privacy-Linie → bewusst vermeiden.
- Vercel Analytics zählt Uniques aggregiert (rotierender Hash) — keine Einzelgeräte-Identität für dich.
**Aufwand:** anon-ID ~1 h.

### 4. Weitere Nutzungsmetriken
**Warum:** zeigt, welche Features wirklich genutzt werden → Priorisierung.
**Ideen:** Anzahl Suchen, geöffnete Detail-Sheets, genutzte Filter (AC/DC/kW/Stecker), gesetzte Favoriten, PWA-Installationen, Teilen-Klicks.
**Wie:** Vercel Analytics Custom Events, oder eigene `/api/event`-Route → Postgres. Datensparsam halten.
**Aufwand:** ~1–2 h für ein paar Schlüssel-Events.

### Schweizer Foren für Promotion recherchieren
**Status:** Todo 2026-06-07.
**Warum:** Reichweite gewinnen — die App in passenden CH-Communities vorstellen.
**Wie:** Liste relevanter Schweizer Foren/Communities zum Thema E-Mobilität/Laden zusammenstellen (z. B. EV-/Elektroauto-Foren, TCS-Community, Tesla-CH-Gruppen, Reddit r/Switzerland, einschlägige Facebook-Gruppen). Pro Forum die Regeln zu Eigenwerbung prüfen, dann gezielt posten — idealerweise mit dem Kampagnen-Link (UTM/Not-Aus, siehe Punkt 5) zur Herkunftsmessung.
**Aufwand:** Recherche ~1 h.

### 5. Kampagnen-Link für Foren — mit Not-Aus
**Warum:** Link in E-Auto-Foren streuen, Herkunft messen, und bei Überlast das **Vercel-Hobby-Kontingent schützen**.
**Wie:**
- Trackbarer Link: UTM-Parameter (`?ref=forum-xy`) oder eigene Redirect-Route (`/f/<slug>` → Hauptseite); Herkunft via Analytics auswerten.
- **Kill-Switch:** Feature-Flag (ENV-Variable oder Postgres-Flag), das den Kampagnen-Einstieg deaktiviert bzw. die App in einen „aktuell stark nachgefragt"-Modus schaltet, falls Hobby-Limits (Bandbreite, Function-Invocations, Analytics-Events) zu überschreiten drohen.
- Hinweis: Vercel **Hobby ist für nicht-kommerzielle Nutzung** gedacht; bei echtem Andrang ggf. Pro-Abo nötig.
**Aufwand:** Link + Tracking ~1 h; Kill-Switch ~1–2 h.

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
