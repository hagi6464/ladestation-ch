"use client";

import { useState } from "react";
import { useInstall } from "@/lib/install";
import { Sheet } from "@/components/ui/Sheet";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { Button } from "@/components/ui/Button";
import { InfoCallout } from "@/components/ui/InfoCallout";
import { IconCheck, IconDownload } from "@/components/ui/Icon";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InstallModal({ open, onClose }: Props) {
  const { canInstall, isIosSafari, isStandalone, install } = useInstall();
  const [busy, setBusy] = useState(false);

  const handleInstall = async () => {
    setBusy(true);
    try {
      const result = await install();
      if (result === "accepted") onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Karte als App speichern">
      <SheetHeader
        icon={<IconDownload size={20} />}
        title="Auf den Home-Bildschirm"
        subtitle="Karte direkt starten — ohne Adressleiste. Kein App-Store, keine Werbung."
        onClose={onClose}
      />

      {isStandalone ? (
        <InfoCallout tone="success" icon={<IconCheck size={16} />}>
          Bereits als App installiert — du nutzt gerade die Standalone-Ansicht.
        </InfoCallout>
      ) : isIosSafari ? (
        <div className="space-y-3 t-body text-secondary">
          <p>So fügst du die Karte im Safari hinzu:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Tippe unten auf das Teilen-Symbol{" "}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block align-text-bottom"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              .
            </li>
            <li>
              Wähle <strong>&laquo;Zum Home-Bildschirm&raquo;</strong>.
            </li>
            <li>Bestätige mit &laquo;Hinzufügen&raquo;.</li>
          </ol>
        </div>
      ) : canInstall ? (
        <p className="t-body text-secondary">
          Dein Browser fügt die Karte mit einem Klick zum Home-Bildschirm hinzu —
          wie eine App.
        </p>
      ) : (
        <p className="t-body text-secondary">
          Dein Browser unterstützt die App-Verknüpfung nicht. Versuche es auf dem
          Handy mit Chrome (Android) oder Safari (iOS).
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Schliessen
        </Button>
        {canInstall && !isStandalone && (
          <Button size="sm" onClick={handleInstall} loading={busy}>
            Hinzufügen
          </Button>
        )}
      </div>
    </Sheet>
  );
}
