import type { SVGProps } from "react";

export type PlugType =
  | "type2"
  | "ccs2"
  | "ccs1"
  | "chademo"
  | "type1"
  | "schuko"
  | "tesla"
  | "generic";

const PLUG_RULES: Array<{ needle: string; type: PlugType; label: string }> = [
  { needle: "ccs combo 2", type: "ccs2", label: "CCS Combo 2" },
  { needle: "ccs combo 1", type: "ccs1", label: "CCS Combo 1" },
  { needle: "chademo", type: "chademo", label: "CHAdeMO" },
  { needle: "type 2", type: "type2", label: "Type 2" },
  { needle: "type2", type: "type2", label: "Type 2" },
  { needle: "mennekes", type: "type2", label: "Type 2" },
  { needle: "type 1", type: "type1", label: "Type 1" },
  { needle: "type1", type: "type1", label: "Type 1" },
  { needle: "j1772", type: "type1", label: "Type 1" },
  { needle: "schuko", type: "schuko", label: "Schuko" },
  { needle: "haushalt", type: "schuko", label: "Schuko" },
  { needle: "household", type: "schuko", label: "Schuko" },
  { needle: "tesla", type: "tesla", label: "Tesla" },
];

export function classifyPlug(bfeName: string): {
  type: PlugType;
  label: string;
} {
  const n = bfeName.toLowerCase();
  for (const rule of PLUG_RULES) {
    if (n.includes(rule.needle)) {
      return { type: rule.type, label: rule.label };
    }
  }
  return { type: "generic", label: bfeName };
}

type IconProps = SVGProps<SVGSVGElement>;

function Type2({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="12" cy="12" rx="7.5" ry="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="7.7" r="0.9" fill="currentColor" />
      <circle cx="8.6" cy="11" r="0.9" fill="currentColor" />
      <circle cx="15.4" cy="11" r="0.9" fill="currentColor" />
      <circle cx="10" cy="14.6" r="0.9" fill="currentColor" />
      <circle cx="14" cy="14.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

function Ccs2({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <ellipse cx="12" cy="7.5" rx="6.5" ry="4.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="4.8" r="0.7" fill="currentColor" />
      <circle cx="9.5" cy="7.2" r="0.7" fill="currentColor" />
      <circle cx="14.5" cy="7.2" r="0.7" fill="currentColor" />
      <circle cx="10.5" cy="9.4" r="0.7" fill="currentColor" />
      <circle cx="13.5" cy="9.4" r="0.7" fill="currentColor" />
      <circle cx="8.5" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Ccs1({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10.2" cy="7" r="0.7" fill="currentColor" />
      <circle cx="13.8" cy="7" r="0.7" fill="currentColor" />
      <circle cx="12" cy="9.8" r="0.7" fill="currentColor" />
      <circle cx="8.5" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Chademo({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="15.5" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="15.5" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

function Type1({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="9.5" cy="14.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function Schuko({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="12" r="1.4" fill="currentColor" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" />
      <path d="M 9 5.5 L 15 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Tesla({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="4" y="4.5" width="16" height="15" rx="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 8 9 L 16 9 M 12 9.2 L 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Generic({ ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M 13 2 L 5 14 L 11 14 L 9 22 L 19 10 L 13 10 L 13 2 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PlugIcon({
  type,
  ...props
}: { type: PlugType } & IconProps) {
  switch (type) {
    case "type2":
      return <Type2 {...props} />;
    case "ccs2":
      return <Ccs2 {...props} />;
    case "ccs1":
      return <Ccs1 {...props} />;
    case "chademo":
      return <Chademo {...props} />;
    case "type1":
      return <Type1 {...props} />;
    case "schuko":
      return <Schuko {...props} />;
    case "tesla":
      return <Tesla {...props} />;
    default:
      return <Generic {...props} />;
  }
}
