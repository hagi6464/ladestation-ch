"use client";

import { Sheet } from "@/components/ui/Sheet";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Button } from "@/components/ui/Button";
import { IconHeart } from "@/components/ui/Icon";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Gehostete Payrexx-Trinkgeldseite (öffentliche URL, kein Secret).
const DONATION_URL = "https://ladestation-ch.payrexx.com/pay?tid=616b7704";
const isPlaceholder = DONATION_URL.includes("PLATZHALTER");

export function DonationModal({ open, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Diese App unterstützen">
      <SheetHeader
        icon={<IconHeart size={20} />}
        title="Diese App unterstützen"
        subtitle="Gratis, werbefrei, ein privates Hobby-Projekt."
        onClose={onClose}
      />

      <p className="t-body text-secondary">
        Wenn dir die Ladestation-Karte hilft, freue ich mich über ein kleines,
        freiwilliges Trinkgeld — mit TWINT oder Karte. Vielen Dank!
      </p>

      {isPlaceholder ? (
        <div className="mt-4 rounded-control bg-surface-muted px-4 py-2.5 text-center text-sm text-tertiary">
          Trinkgeld-Link wird in Kürze aktiviert.
        </div>
      ) : (
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-control bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-control transition-colors hover:bg-brand-hover"
        >
          <IconHeart size={16} />
          Trinkgeld senden
        </a>
      )}

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Schliessen
        </Button>
      </div>
    </Sheet>
  );
}
