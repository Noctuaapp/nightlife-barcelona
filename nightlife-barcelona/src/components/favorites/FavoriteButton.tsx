"use client"

import { useFavorites } from "../../context/FavoritesContext"

type FavoriteButtonProps = {
  itemType: "club" | "event" | "club_event"
  itemId: number
}

const REMINDER_OPTIONS = [
  { value: 0, label: "El mismo día" },
  { value: 1, label: "1 día antes" },
  { value: 3, label: "3 días antes" },
  { value: 7, label: "1 semana antes" },
]

export default function FavoriteButton({
  itemType,
  itemId,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, setReminder, getReminder } = useFavorites()

  const active = isFavorite(itemType, itemId)
  const showReminder = active && (itemType === "event" || itemType === "club_event")
  const currentReminder = getReminder(itemType, itemId)

  return (
    <>
      <button
        onClick={() => toggleFavorite(itemType, itemId)}
        className={`mt-6 flex w-full items-center justify-center rounded-2xl px-6 py-4 font-bold transition hover:scale-[1.02] ${
          active
            ? "bg-pink-500 text-white"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
        }`}
      >
        {active ? "❤️ Guardado" : "🤍 Guardar en favoritos"}
      </button>

      {showReminder && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Avisarme</p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setReminder(itemType, itemId, opt.value)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  currentReminder === opt.value
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}