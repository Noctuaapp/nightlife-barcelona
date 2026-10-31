"use client"

import { useEffect, useMemo, useState } from "react"
import Icon from "../ui/Icon"
import { useLanguage } from "../../context/LanguageContext"
import { useInstallPrompt } from "../../lib/useInstallPrompt"

// Va rotando frases cortas sobre cosas que la app ya hace y que mucha gente no descubre sola
// (niveles, notas de check-in, planificar, favoritos, el mapa...). Es publicidad de la propia
// app, dentro de la propia app.
//
// En pantallas sm+ es un chip flotante arriba a la derecha de la portada (con sitio de sobra para
// no chocar con nada). En móvil, flotarlo ahí tapaba el aviso de "x locales abiertos ahora" (poco
// ancho, mismo rincón) — así que en móvil deja de ser "absolute" y pasa a ser su propia fila, en
// flujo normal, encima de ese aviso: nunca puede superponerse a nada porque ocupa su propio sitio.
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
  // 31/10/2026: el resto de funciones de Noctua, para que la rotación las cubra todas.
  { icon: "bus", key: "homeTicker.msg12" },
  { icon: "clock", key: "homeTicker.msg13" },
  { icon: "scale", key: "homeTicker.msg14" },
  { icon: "pride", key: "homeTicker.msg15" },
  { icon: "cocktail", key: "homeTicker.msg16" },
  { icon: "food", key: "homeTicker.msg17" },
  { icon: "chat", key: "homeTicker.msg18" },
  { icon: "megaphone", key: "homeTicker.msg19" },
  { icon: "users", key: "homeTicker.msg20" },
  { icon: "share", key: "homeTicker.msg21" },
  { icon: "dice", key: "homeTicker.msg22" },
  { icon: "flame", key: "homeTicker.msg23" },
  { icon: "flag", key: "homeTicker.msg24" },
  { icon: "globe", key: "homeTicker.msg25" },
  { icon: "search", key: "homeTicker.msg26" },
]

// 27/10/2026: dos frases más. «Instala Noctua en tu móvil» (se salta si ya la tienes instalada) y un
// aviso honesto de que la web sigue en construcción y todavía faltan fotos de locales.
const INSTALL_MESSAGE = { icon: "smartphone", key: "homeTicker.msg10" }
const PHOTOS_MESSAGE = { icon: "camera", key: "homeTicker.msg11" }

export default function FeatureTicker() {
  const { t } = useLanguage()
  const install = useInstallPrompt()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const messages = useMemo(
    () => (install.installed ? [...MESSAGES, PHOTOS_MESSAGE] : [...MESSAGES, INSTALL_MESSAGE, PHOTOS_MESSAGE]),
    [install.installed]
  )

  // Cada visita empieza por una frase distinta (con tantas, siempre empezar por la primera
  // dejaba las últimas casi sin verse). Se hace tras montar para no desajustar el HTML del servidor.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * messages.length))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      // Un pelín de fundido antes de cambiar el texto, no un corte seco.
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length)
        setVisible(true)
      }, 220)
    }, 4200)
    return () => clearInterval(id)
  }, [messages.length])

  const current = messages[index % messages.length]
  const textCls = "noctua-ticker-text transition-all duration-200"
  const textStyle = { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-3px)" } as const

  return (
    <>
      {/* Móvil: fila normal, sin "absolute" — no puede tapar nada porque empuja su propio sitio. */}
      <div
        aria-live="polite"
        className="relative z-10 mx-4 mb-3 mt-3 flex items-start gap-1.5 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs font-medium leading-snug text-white/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md sm:hidden"
      >
        <Icon name={current.icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
        <span className={`${textCls} line-clamp-2`} style={textStyle}>
          {t(current.key)}
        </span>
      </div>

      {/* sm+: chip flotante arriba a la derecha, con sitio de sobra. */}
      <div
        aria-live="polite"
        className="absolute right-6 top-6 z-10 hidden w-[300px] items-start gap-2 rounded-2xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm font-medium leading-snug text-white/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md sm:flex"
      >
        <Icon name={current.icon} className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
        <span className={`${textCls} line-clamp-2`} style={textStyle}>
          {t(current.key)}
        </span>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { .noctua-ticker-text { transition: none !important; opacity: 1 !important; transform: none !important; } }`}</style>
    </>
  )
}
