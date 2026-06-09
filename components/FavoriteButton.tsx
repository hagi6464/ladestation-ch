"use client";

import { useFavorites } from "@/lib/favorites";
import { IconStar } from "@/components/ui/Icon";

type Props = {
  evseId: string;
  className?: string;
};

export function FavoriteButton({ evseId, className }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(evseId);

  return (
    <button
      type="button"
      onClick={() => toggle(evseId)}
      aria-label={active ? "Favorit entfernen" : "Als Favorit markieren"}
      title={active ? "Favorit entfernen" : "Als Favorit markieren"}
      className={`rounded-full p-1 transition-colors ${
        active ? "text-warning" : "text-tertiary hover:text-warning"
      } ${className ?? ""}`}
    >
      <IconStar size={22} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
