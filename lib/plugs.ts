// Server-sichere Stecker-Taxonomie für den Stationsfilter.
//
// Die rohen Stecker-Namen kommen aus dem BFE/OICP-Feed (stations.plugs: text[])
// als Freitext wie "CCS Combo 2 Plug (Cable Attached)". Wir bündeln sie in die
// drei Kategorien, nach denen ein EV-Fahrer praktisch filtert. Die Needles sind
// kleingeschriebene Substrings, die gegen jeden rohen Namen gematcht werden —
// spiegelt classifyPlug() in components/PlugIcon.tsx wider.

export type PlugFilter = "any" | "type2" | "ccs" | "chademo";

export const PLUG_FILTERS = ["type2", "ccs", "chademo"] as const;

export const PLUG_FILTER_NEEDLES: Record<
  (typeof PLUG_FILTERS)[number],
  readonly string[]
> = {
  type2: ["type 2", "type2", "mennekes"],
  // "tesla": Schweizer Supercharger (V3/V4) haben physisch CCS-2-Stecker und
  // sind mehrheitlich für Fremdmarken offen — BFE meldet sie aber nur als
  // "Tesla Connector". Ohne die Needle fehlen sie im CCS-Filter und im
  // Reiseplaner-Korridor (der CCS-Schnelllader sucht).
  ccs: ["ccs", "tesla"],
  chademo: ["chademo"],
};

export const PLUG_FILTER_LABELS: Record<(typeof PLUG_FILTERS)[number], string> =
  {
    type2: "Type 2",
    ccs: "CCS",
    chademo: "CHAdeMO",
  };
