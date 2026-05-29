"use client";

import { useFavorites } from "@/lib/favorites";

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
        active
          ? "text-amber-500 hover:text-amber-600"
          : "text-zinc-400 hover:text-amber-500"
      } ${className ?? ""}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
