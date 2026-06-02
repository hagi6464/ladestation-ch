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
  ccs: ["ccs"],
  chademo: ["chademo"],
};

export const PLUG_FILTER_LABELS: Record<(typeof PLUG_FILTERS)[number], string> =
  {
    type2: "Type 2",
    ccs: "CCS",
    chademo: "CHAdeMO",
  };
