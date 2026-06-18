/**
 * Gemeinsamer, abhängigkeitsfreier Streaming-CSV-Parser für die Länder-Adapter.
 *
 * RFC-4180-ähnlich: gequotete Felder dürfen Trennzeichen, Komma und Zeilenumbruch
 * enthalten, Quote-Escape per `""`. Trennzeichen ist konfigurierbar (FR: `,`,
 * DE-Bundesnetzagentur: `;`). `push(chunk)` liefert die seither vollständig
 * gelesenen Zeilen, `end()` die letzte Restzeile; der Zustand bleibt über
 * Chunk-Grenzen erhalten (für gestreamte Downloads).
 */
export class CsvParser {
  private field = "";
  private row: string[] = [];
  private inQuotes = false;
  private pendingQuote = false; // schliessende Quote gesehen, evtl. Escape ("")
  private readonly delimiter: string;

  constructor(delimiter = ",") {
    this.delimiter = delimiter;
  }

  push(chunk: string): string[][] {
    const rows: string[][] = [];
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (this.pendingQuote) {
        this.pendingQuote = false;
        if (ch === '"') {
          this.field += '"'; // escapte Quote innerhalb eines gequoteten Feldes
          continue;
        }
        this.inQuotes = false; // Quote hatte das Feld geschlossen → ch normal
      }
      if (this.inQuotes) {
        if (ch === '"') this.pendingQuote = true;
        else this.field += ch;
        continue;
      }
      if (ch === '"') {
        this.inQuotes = true;
      } else if (ch === this.delimiter) {
        this.row.push(this.field);
        this.field = "";
      } else if (ch === "\n") {
        this.row.push(this.field);
        this.field = "";
        rows.push(this.row);
        this.row = [];
      } else if (ch !== "\r") {
        this.field += ch;
      }
    }
    return rows;
  }

  /** Letzte Zeile, falls die Datei nicht mit Zeilenumbruch endet. */
  end(): string[][] {
    if (this.field !== "" || this.row.length > 0) {
      this.row.push(this.field);
      const row = this.row;
      this.field = "";
      this.row = [];
      return [row];
    }
    return [];
  }
}

/** Komplett-Parse für Tests/kleine Strings. BOM wird entfernt. */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const p = new CsvParser(delimiter);
  const rows = p.push(text.replace(/^﻿/, ""));
  return [...rows, ...p.end()];
}

/** Zeilen-Arrays anhand der Header-Zeile in Objekte umwandeln. */
export function rowsToObjects(
  header: string[],
  rows: string[][],
): Record<string, string>[] {
  return rows.map((r) => {
    const o: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) o[header[i]] = r[i] ?? "";
    return o;
  });
}
