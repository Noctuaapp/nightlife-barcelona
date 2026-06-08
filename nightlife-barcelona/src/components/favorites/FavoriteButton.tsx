"use client"

import { useFavorites } from "../../context/FavoritesContext"

type FavoriteButtonProps = {
  itemType: "club" | "event" | "club_event"
  itemId: number
}

export default function FavoriteButton({
  itemType,
  itemId,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()

  const active = isFavorite(itemType, itemId)

  return (
    <button
      onClick={() => toggleFavorite(itemType, itemId)}
      className={`mt-6 flex w-full items-center justify-center rounded-2xl px-6 py-4 font-bold transition hover:scale-[1.02] ${
        active
          ? "bg-pink-500 text-white"
          : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      }`}
    >
      {active ? "❤️ Saved" : "🤍 Save to favorites"}
    </button>
  )
}