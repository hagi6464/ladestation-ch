import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { IconClose } from "@/components/ui/Icon";

type Props = {
  /** Icon shown in the emerald badge (omit for a plain title row). */
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
};

/** Modal header: optional brand icon badge + title/subtitle + close button.
 *  Replaces the byte-identical header block shared by the modals. */
export function SheetHeader({ icon, title, subtitle, onClose }: Props) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand text-on-brand">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="t-title text-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-secondary">{subtitle}</p>}
      </div>
      <IconButton label="Schliessen" onClick={onClose} className="-mr-1 -mt-1">
        <IconClose />
      </IconButton>
    </div>
  );
}
