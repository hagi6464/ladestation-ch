/**
 * Übersetzt technische OICP-Felder der BFE-Ladestellen-Daten in
 * nutzerfreundliche deutsche Labels.
 */

export function labelAuthMode(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("direct")) return "Direktzahlung (Karte)";
  if (r.includes("rfid") || r.includes("nfc")) return "RFID-Karte";
  if (r.includes("remote")) return "App";
  if (r.includes("plug") || r === "pnc") return "Plug & Charge";
  if (r.includes("sms")) return "SMS";
  if (r.includes("phone")) return "Telefon";
  return raw;
}

export function labelAuthModes(modes: string[]): string[] {
  const out: string[] = [];
  for (const m of modes) {
    const label = labelAuthMode(m);
    if (!out.includes(label)) out.push(label);
  }
  return out;
}

export function labelAccessibility(raw: string | null): string | null {
  if (!raw) return null;
  const r = raw.toLowerCase();
  if (r.includes("paying") && r.includes("public"))
    return "Öffentlich, zahlpflichtig";
  if (r.includes("free") && r.includes("public"))
    return "Öffentlich, gratis";
  if (r.includes("restricted")) return "Eingeschränkter Zugang";
  if (r.includes("test")) return "Teststation";
  return raw;
}
