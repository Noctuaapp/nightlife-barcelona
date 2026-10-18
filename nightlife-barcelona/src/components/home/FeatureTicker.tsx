"use client"

import { useEffect, useState } from "react"
import Icon from "../ui/Icon"
import { useLanguage } from "../../context/LanguageContext"

// Chip flotante arriba a la derecha de la portada que va rotando frases cortas sobre cosas que
// la app ya hace y que mucha gente no descubre sola (niveles, notas de check-in, planificar,
// favoritos, el mapa...). Es publicidad de la propia app, dentro de la propia app.
const MESSAGES: { icon: string; key: string }[] = [
  { icon: "star", key: "homeTicker.msg1" },
  { icon: "note", key: "homeTicker.msg2" },
  { icon: "calendar", key: "homeTicker.msg3" },
  { icon: "sparkle", key: "homeTicker.msg4" },
  { icon: "heart", key: "homeTicker.msg5" },
  { icon: "hourglass", key: "homeTicker.msg6" },
  { icon: "car", key: "homeTicker.msg7" },
  { icon: "thermometer", key: "homeTicker.msg8" },
  { icon: "map", key: "homeTicker.msg9" },
]

export default function FeatureTicker() {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      // Un pelín de fundido antes de cambiar el texto, no un corte seco.
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 220)
    }, 4200)
    return () => clearInterval(id)
  }, [])

  const current = MESSAGES[index]

  return (
    <div
      aria-live="polite"
      className="absolute right-3 top-3 z-10 flex w-[150px] items-start gap-1.5 rounded-2xl border border-white/15 bg-black/40 px-2.5 py-2 text-[10px] font-medium leading-snug text-white/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md sm:right-6 sm:top-6 sm:w-[300px] sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-sm"
    >
      <Icon name={current.icon} className="mt-0.5 h-3 w-3 shrink-0 text-cyan-300 sm:h-4 sm:w-4" />
      <span
        className="noctua-ticker-text line-clamp-3 transition-all duration-200 sm:line-clamp-2"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-3px)" }}
      >
        {t(current.key)}
      </span>
      <style>{`@media (prefers-reduced-motion: reduce) { .noctua-ticker-text { transition: none !important; opacity: 1 !important; transform: none !important; } }`}</style>
    </div>
  )
}
