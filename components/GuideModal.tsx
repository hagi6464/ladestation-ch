"use client";

import { Sheet } from "@/components/ui/Sheet";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Button } from "@/components/ui/Button";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { IconZap } from "@/components/ui/Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  onInstall: () => void;
};

const STEPS: Array<{ title: string; desc: string }> = [
  {
    title: "Suchen",
    desc: "Ort oder Adresse eingeben — die Karte springt hin.",
  },
  {
    title: "Filtern",
    desc: "Nach AC/DC, Leistung (kW) und Stecker-Typ eingrenzen.",
  },
  {
    title: "Säule antippen",
    desc: "Verfügbarkeit, Stecker, Tarife und Navigation im Detail.",
  },
  {
    title: "Favoriten",
    desc: "Säulen merken und mit „nur Favoriten“ schnell wiederfinden.",
  },
];

export function GuideModal({ open, onClose, onInstall }: Props) {
  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Kurzanleitung">
      <SheetHeader
        icon={<IconZap size={20} />}
        title="Ladestation Schweiz"
        subtitle="Kurzanleitung — in 4 Schritten zur passenden Ladesäule."
        onClose={onClose}
      />

      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span
              className="shrink-0 text-sm font-semibold tabular-nums text-brand"
              aria-hidden="true"
            >
              {i + 1}.
            </span>
            <div className="text-sm">
              <div className="font-medium text-primary">{s.title}</div>
              <div className="text-secondary">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>

      <InfoCallout tone="success" className="mt-4">
        <div className="text-sm font-medium">Diese App aufs Handy?</div>
        <p className="mt-0.5">
          Direkt auf den Home-Bildschirm — kein App-Store, keine Werbung.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={onInstall}
          className="mt-2 w-full"
        >
          Als App speichern
        </Button>
      </InfoCallout>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Los geht’s
        </Button>
      </div>
    </Sheet>
  );
}
