# Ladestation-App (Schweiz)

Web-App, die alle öffentlich zugänglichen Ladesäulen in der Schweiz anzeigt und pro Säule den hinterlegten Eigentarif des Betreibers ausgibt.

## Datenquellen (alle gesichert)

- **Standorte + Live-Verfügbarkeit:** [ich-tanke-strom.ch](https://www.ich-tanke-strom.ch) / DIEMO (BFE, EnergieSchweiz, swisstopo) — frei via [data.geo.admin.ch](https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/) (~14'200 Ladepunkte, OICP-Format)
- **CPO-Eigentarife:** kuratierte TypeScript-Datei [lib/cpo-tariffs.ts](lib/cpo-tariffs.ts) mit den ~15 wichtigsten CH-Betreibern (Energie 360°, Swisscharge, GOFAST, Migrol, IONITY, Tesla, …). Daten aus den jeweiligen Anbieter-Websites, manuell gepflegt
- **Karten-Basemap:** Swisstopo Vector Tiles

Drittanbieter-Aggregatoren (Chargeprice, OpenChargeMap) wurden evaluiert und verworfen — beide lieferten in der CH-Realität entweder ungenaue Geo-Matches (falsche Säule) oder unstrukturierte Free-Text-Daten.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle ORM · Postgres (Neon) · MapLibre GL JS · TanStack Query · Zod

## Setup

### 1. Neon Postgres anlegen
1. Konto auf [console.neon.tech](https://console.neon.tech) erstellen (Free Tier reicht)
2. Neues Projekt anlegen, Region `EU Central (Frankfurt)` wählen
3. Connection String aus dem Dashboard kopieren (Variante "pooled" für die App)

### 2. Environment einrichten
```bash
cp .env.example .env.local
# DATABASE_URL und CRON_SECRET ausfüllen
```

### 3. Schema in die DB schreiben
```bash
pnpm install
pnpm db:push      # erzeugt Tabellen in Neon
```

### 4. BFE-Daten ingestieren
```bash
pnpm dev          # in einem Terminal
# in einem anderen Terminal:
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/sync-bfe-static
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" http://localhost:3000/api/cron/sync-bfe-status
```

Der erste Static-Sync dauert ~30–60 s (25 MB JSON, ~18k Upserts). Status-Sync ~5–10 s.

### 5. Karte ansehen
[http://localhost:3000](http://localhost:3000) — Karte mit allen geladenen Stationen.

## Projekt-Struktur

```
app/
  api/cron/sync-bfe-static/    GET (Bearer-Auth) → upsertet ~18k Stationen
  api/cron/sync-bfe-status/    GET → upsertet Live-Verfügbarkeit
  api/stations/                Bbox-GeoJSON für die Karte
  api/stations/[evseId]/       Stations-Detail
  api/prices/[evseId]/         CPO-Eigentarif (aus lib/cpo-tariffs.ts)
  page.tsx                     Karte + Detail-Sheet
components/
  Map.tsx                      MapLibre + Swisstopo + Clustering
  StationSheet.tsx             Detail-Panel
  PlugIcon.tsx                 SVG-Icons der Stecker-Typen
  FilterBar.tsx                AC/DC + kW Filter
lib/
  db/schema.ts                 Drizzle-Schema (stations, station_status)
  db/index.ts                  Postgres-Client
  bfe.ts                       typed Parser für OICP-JSON
  cpo-tariffs.ts               kuratierte Eigentarife der CH-CPOs
```

## Tarife pflegen

`lib/cpo-tariffs.ts` enthält 1–2 Standardtarife pro grossem CH-Anbieter. Bei Preisänderungen den jeweiligen Eintrag im Code aktualisieren und `lastUpdated` setzen — kein DB-Schema-Change nötig.

## Roadmap

- **Phase 1:** BFE-Sync + DB-Schema ✓
- **Phase 2:** Karten-UI mit Markern, Filter, Detail-Sheet, Navigation ✓
- **Phase 3:** CPO-Eigentarife pro Säule ✓
- **Phase 4:** Geocoding-Suche, Deployment auf Vercel, Polish ✓ (live unter [ladestation-ch.vercel.app](https://ladestation-ch.vercel.app))

Detaillierter Plan: siehe [Plan-Datei](C:/Users/cadmin/.claude/plans/suche-nach-der-offizillen-sprightly-umbrella.md).
