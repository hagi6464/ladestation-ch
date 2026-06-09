# Changelog

Notiert die nutzerseitig sichtbaren Änderungen der App — neueste zuoberst.
Locker angelehnt an [Keep a Changelog](https://keepachangelog.com/de/); Versionierung
per Datum, da die App kontinuierlich auf Vercel deployt wird.

## 2026-06-09

### Verbessert (Reiseplaner)
- **Empfehlung nach Fahrtseite**: Die empfohlene Ladesäule liegt jetzt auf der Seite, die
  man in Fahrtrichtung ohne Kreuzen erreicht (rechts der Fahrtrichtung). Säulen auf der
  Gegenfahrbahn werden mit „↔ Gegenfahrbahn" markiert und nicht mehr empfohlen.
- **Lade-Position ohne Lücken**: „Anfang / Mitte / Ende" decken die Reichweite jetzt
  lückenlos in Dritteln ab (0–⅓ / ⅓–⅔ / ⅔–volle Reichweite) — so gehen keine interessanten
  Ladesäulen mehr zwischen den Zonen verloren.

## 2026-06-08

### Neu
- **Neues App-Icon**: stilisierte Ladesäule mit Schweizerkreuz und Blitz (statt nur Blitz).

### Verbessert (Reiseplaner)
- **Start automatisch & frei wählbar**: Beim Öffnen von „Reise planen" wird der Standort
  automatisch abgefragt. Zusätzlich lässt sich der **Start** — wie das Ziel — als Adresse
  eingeben und überschreibt damit den GPS-Standort.
- **Kompakteres Layout**: Fahrzeug-/Verbrauchshinweis auf einer Zeile; der
  „Nur an der Autobahn"-Schalter sitzt nun platzsparend neben Anfang/Mitte/Ende.
- **Klarere Distanzen je Ladestopp**: „Ab Start: … km" (Fahrstrecke bis zur Säule) und
  „Nach Laden noch … km zum Ziel".
- **Gewählte Ladesäule auf der Karte**: empfohlene bzw. ausgewählte Stopps werden mit
  einem eigenen Säulen-Icon (Abwandlung des App-Icons) markiert.
- **Querformat-Tipp**: auf dem Handy im Hochformat weist ein Hinweis darauf hin, das Gerät
  zu drehen, damit Karte und Planer nebeneinander sichtbar sind.

## 2026-06-07

### Neu (Reiseplaner)
- **Autobahn-Filter**: Schalter „🛣️ Nur an der Autobahn" zeigt nur Schnelllader über
  100 kW, die praktisch ohne Umweg an der Route liegen (Raststätte / direkt an der
  Aus-/Einfahrt). Der seitliche Umweg jeder Säule wird transparent angezeigt.
- **Ankunfts-Ladestand**: Statt eines festen km-Puffers gibst du jetzt an, mit wie viel
  Prozent du am Ziel ankommen möchtest; die nötige Reserve wird daraus berechnet.
- **Lade-Position**: Vorliebe „Anfang / Mitte / Ende" zeigt gezielt die Schnelllader im
  passenden Reichweiten-Abschnitt ab Start — Anfang = erstes Drittel, Mitte = Mitte der
  Reichweite, Ende = 70–90 % der Reichweite. Der angezeigte km-Abschnitt ist sichtbar; die
  stärkste Säule darin ist als „Empfohlen" vorausgewählt.

### Verbessert (Reiseplaner)
- **Eingaben** für Verbrauch und Ankunfts-Ladestand sind jetzt Auswahlräder
  (Verbrauch 10–40 kWh/100 km, Ankunft 15–80 %); auf dem iPhone zoomt die Ansicht
  beim Antippen der Eingabefelder nicht mehr ungewollt hinein.
- Klarstellung der Distanzen: Strecke entlang der Route = Fahrstrecke, der Umweg
  „ab Route" = Luftlinie.

## 2026-06-06

### Neu
- **Reiseplaner (Beta)**: Über das Logo-Menü „Reise planen" ein Ziel eingeben — die
  App zeichnet die Fahrroute, zeigt CCS-Schnelllader entlang der Strecke (mit Leistung,
  ungefährer Ladezeit und Tarif) und markiert, ab wo nachgeladen werden sollte. Die
  Reichweite wird aus dem Ladezustand (%) für ein Tesla Model Y (Long Range, Verbrauch
  anpassbar) berechnet; Startpunkt ist der GPS-Standort.
- **Route an Google Maps übergeben**: Ausgewählte Ladestopps werden als Wegpunkte
  übernommen (auf dem Handy max. 3, am Desktop mehr). Apple Karten übernimmt technisch
  bedingt nur den nächsten Stopp.
- Hinweis: Der Reiseplaner ist eine grobe Orientierung ohne Gewähr — der reale
  Verbrauch hängt von Tempo, Wetter und Höhenprofil ab.

## 2026-06-05

### Neu
- **Säule teilen**: Der Teilen-Button im Detail-Fenster (oben rechts) erzeugt einen Link, der
  die App direkt zu dieser Säule führt und das Detail öffnet — teilbar per WhatsApp, SMS, Mail
  … (am Desktop wird der Link in die Zwischenablage kopiert).
- **Reichweiten-Filter**: „Reichweite ▾" in der Filterleiste zeichnet einen Kreis um den
  eigenen Standort (50 / 75 / 100 / 200 km); Säulen und Cluster ausserhalb der Reichweite
  werden grau dargestellt. Distanz als Luftlinie gemessen (Hinweis bei aktivem Filter).
  Voraussetzung: Standort per 📍-Button setzen.
- **Anonyme Besuchsstatistik** via Vercel Web Analytics (cookielos, ohne
  geräteübergreifende Wiedererkennung); Datenschutz-Hinweis im Impressum entsprechend ergänzt.

## 2026-06-04

### Neu
- **Anbieter-App öffnen**: Im Detail einer Ladesäule erscheint – sofern der Betreiber eine
  eigene Lade-App hat – ein „App öffnen"-Button. Er öffnet die App im App Store (iPhone)
  bzw. Play Store (Android) und startet sie, falls installiert. Kuratiert für 11 Betreiber
  (u. a. Swisscharge, MOVE, evpass, IONITY, Tesla, M-Charge, Plug'n Roll, EnBW, eCarUp).
- **Standort auf der Karte**: Der 📍-Button zeigt nun zusätzlich einen blauen Punkt mit
  Genauigkeitskreis, der anzeigt, wo man sich gerade befindet.
- **Trinkgeld-Funktion**: „❤️ Trinkgeld senden" im Logo-Menü öffnet ein kurzes Dank-Fenster
  mit Button (TWINT & Karte via Payrexx, öffnet im neuen Tab).
- **Impressum-Seite** (`/impressum`) mit Angebot, Datenquellen, Haftung und Datenschutz;
  dezenter Link unten links auf der Karte.

### Verbessert
- **Detail-Ansicht einer Säule aufgeräumt**: Betreiber und „App öffnen" zusammengefasst,
  die Stecker-Typen in die „Ladepunkte"-Überschrift integriert, den Navigations-Button neben
  die Adresse gestellt und „Zahlung & Zugang" mitgruppiert.
- **Ladepunkte-Liste entschlackt**: identische Ladepunkte werden als „N×" zusammengefasst,
  und der Stecker-Text je Zeile entfällt, wenn alle Punkte denselben Stecker haben.
- **„100% erneuerbar"** als kräftigeres grünes Badge hervorgehoben.
- Die Navigations-App-Auswahl schliesst sich nun automatisch beim Wechsel auf eine andere Säule.

## 2026-06-02

### Neu
- **Stecker-Typ-Filter** (Type 2 / CCS / CHAdeMO) — zusätzlich zu AC/DC und Leistung.
- **Kurz-Anleitung** für Erstnutzer: öffnet beim ersten Besuch einmalig automatisch und
  ist jederzeit wieder über das Logo-Menü aufrufbar.
- **Logo-Menü** mit „Kurzanleitung", „Als App speichern" und „Weiterempfehlen".
- **App weiterempfehlen**: öffnet auf dem Handy die native Teilen-Liste
  (WhatsApp, SMS, Mail …); am Desktop wird der Link in die Zwischenablage kopiert.

### Verbessert
- **Filterleiste mobil kompakter**: „Favoriten" in die obere Zeile neben AC/DC verschoben;
  der Stecker-Filter ist standardmäßig eingeklappt und per ▾ ausklappbar.
- **PWA-Installation** von Banner auf ein dezentes Modal umgestellt; der Install-Hinweis
  in der Anleitung ist nun ein hervorgehobener Button, der den Dialog direkt öffnet.
- **CPO-Tarif-Links**: 7 tote bzw. umgeleitete Preis-/Tarifseiten auf aktuelle URLs
  korrigiert (u. a. Swisscharge, GOFAST, MOVE, Shell Recharge, Allego, EWZ, EWB).
