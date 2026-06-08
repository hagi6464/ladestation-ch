import { isInServiceArea } from "@/lib/service-area";

export type UserLocation = { lat: number; lon: number; accuracy: number };

export type GeolocateErrorCode =
  | "unsupported"
  | "denied"
  | "out-of-area"
  | "failed";

/** Fehler der Standortabfrage mit Code + nutzerlesbarer Meldung. */
export class GeolocateError extends Error {
  code: GeolocateErrorCode;
  constructor(code: GeolocateErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "GeolocateError";
  }
}

/**
 * Aktuellen Standort abfragen und gegen die Service-Area (CH/FL + Grenzregion)
 * prüfen. Geteilt von der Hauptsuche (SearchBox) und dem Reiseplaner.
 */
export function requestUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        new GeolocateError(
          "unsupported",
          "Standort wird von diesem Browser nicht unterstützt.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!isInServiceArea(latitude, longitude)) {
          reject(
            new GeolocateError(
              "out-of-area",
              "Dein Standort liegt ausserhalb des abgedeckten Gebiets (Schweiz/Liechtenstein). Keine Ladesäulen-Daten verfügbar.",
            ),
          );
          return;
        }
        resolve({ lat: latitude, lon: longitude, accuracy });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new GeolocateError("denied", "Standortfreigabe wurde verweigert."),
          );
        } else {
          reject(
            new GeolocateError(
              "failed",
              "Standort konnte nicht ermittelt werden.",
            ),
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
