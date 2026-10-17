"use client"

import { useState } from "react"

import { useFavorites } from "../../context/FavoritesContext"
import { useLanguage } from "../../context/LanguageContext"
import AuthGateModal from "../ui/AuthGateModal"
import Icon from "../ui/Icon"
import { toast } from "../ui/Toast"

type FavoriteButtonProps = {
  itemType: "club" | "event" | "club_event"
  itemId: number
  // "tile": recuadro pequeño (ficha de club). "icon": solo el corazón (barra fija del móvil).
  variant?: "full" | "tile" | "icon"
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
  variant = "full",
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

  // Antes, elegir una opción de aviso actualizaba el color del botón pero no decía nada más — y
  // como "el mismo día" ya viene marcado por defecto desde que se guarda (reminder_days_before: 0),
  // tocarlo no cambiaba nada visible: parecía que el toque no había hecho nada y no había manera de
  // "confirmarlo". Ahora cada toque, cambie o no el valor, muestra un aviso claro de que ha quedado
  // guardado.
  const handleReminder = async (value: number) => {
    await setReminder(itemType, itemId, value)
    toast(`✓ ${t(REMINDER_OPTIONS.find((o) => o.value === value)?.key || "")}`)
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={handleToggle}
          aria-pressed={active}
          aria-label={active ? t("favorites.saved") : t("favorites.save")}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl border transition ${
            active ? "border-brand bg-brand text-white" : "border-white/15 bg-white/5 text-ink hover:bg-white/10"
          }`}
        >
          <Icon name="heart" className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
        </button>
      ) : variant === "tile" ? (
        <button
          onClick={handleToggle}
          aria-pressed={active}
          className={`flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-ctl px-2 py-3 text-xs font-semibold transition ${
            active ? "bg-brand text-white hover:bg-brand-strong" : "border border-white/10 bg-white/5 text-ink hover:bg-white/10"
          }`}
        >
          <Icon name="heart" className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
          {active ? t("favorites.savedShort") : t("favorites.saveShort")}
        </button>
      ) : (
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
      )}

      {showReminder && variant !== "icon" && (
        <div className={`mt-3 rounded-ctl border border-white/10 bg-white/5 p-4 ${variant === "tile" ? "col-span-full" : ""}`}>
          <p className="mb-3 text-xs font-semibold text-zinc-400">{t("favorites.remindMe")}</p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleReminder(opt.value)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                  currentReminder === opt.value
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                }`}
              >
                {currentReminder === opt.value && <Icon name="check" className="h-3.5 w-3.5" />}
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
