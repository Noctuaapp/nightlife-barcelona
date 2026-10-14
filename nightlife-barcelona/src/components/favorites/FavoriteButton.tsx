"use client"

import { useState } from "react"

import { useFavorites } from "../../context/FavoritesContext"
import { useLanguage } from "../../context/LanguageContext"
import AuthGateModal from "../ui/AuthGateModal"
import Icon from "../ui/Icon"

type FavoriteButtonProps = {
  itemType: "club" | "event" | "club_event"
  itemId: number
}

const REMINDER_OPTIONS = [
  { value: 0, key: "favorites.reminder_same_day" },
  { value: 1, key: "favorites.reminder_1_day" },
  { value: 3, key: "favorites.reminder_3_days" },
  { value: 7, key: "favorites.reminder_1_week" },
]

export default function FavoriteButton({
  itemType,
  itemId,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, setReminder, getReminder } = useFavorites()
  const { t } = useLanguage()
  const [showAuthGate, setShowAuthGate] = useState(false)

  const active = isFavorite(itemType, itemId)
  const showReminder = active && (itemType === "event" || itemType === "club_event")
  const currentReminder = getReminder(itemType, itemId)

  const handleToggle = async () => {
    const ok = await toggleFavorite(itemType, itemId)
    if (!ok) setShowAuthGate(true)
  }

  return (
    <>
      <button
        onClick={handleToggle}
        aria-pressed={active}
        className={`flex w-full items-center justify-center gap-2 rounded-ctl px-6 py-3.5 text-sm font-semibold transition ${
          active ? "bg-brand text-white hover:bg-brand-strong" : "border border-white/10 bg-white/5 text-ink hover:bg-white/10"
        }`}
      >
        <Icon name="heart" className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
        {active ? t("favorites.saved") : t("favorites.save")}
      </button>

      {showReminder && (
        <div className="mt-3 rounded-ctl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-xs font-semibold text-zinc-400">{t("favorites.remindMe")}</p>
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
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>
      )}

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        subtitleKey="authGate.subtitleFavorites"
      />
    </>
  )
}
