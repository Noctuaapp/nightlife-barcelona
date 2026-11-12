"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { useInstallPrompt } from "../../lib/useInstallPrompt"
import { track } from "../../lib/track"

// Aviso de instalar la app, arriba del todo (12/11/2026). Una franja fina, encima de la cabecera, que se va con
// el scroll (no se queda pegada tapando contenido). Es la entrada más visible a «Instalar Noctua»; el botón del
// menú ☰ y la tarjeta de la portada siguen donde estaban.
//   · Solo en móvil y solo si la app no está ya instalada (lo decide useInstallPrompt).
//   · Android/Chrome: «Instalar» abre el cuadro del navegador. iPhone (Safari no tiene ese cuadro): despliega
//     el paso a mano debajo de la franja.
//   · Sale a los 4 s de entrar, no en las páginas de cuenta, el admin ni las páginas en otros idiomas.
//   · Se cierra con la X y no vuelve en 7 días; si se vuelve a cerrar, 30 días. Se recuerda en el propio móvil.
// Cada pulsación en «Instalar» se anota como install_click con from = «banner» (Admin › Visitas).

const KEY = "noctua_install_banner"
const DAY = 86_400_000
const SHOW_AFTER_MS = 4000
const HIDDEN_PREFIXES = ["/admin", "/login", "/signup", "/recuperar", "/confirm-age", "/blocked", "/privacy", "/terms", "/en", "/fr", "/de", "/it"]

type Memory = { until: number; closed: number }

function readMemory(): Memory {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { until: 0, closed: 0 }
    const v = JSON.parse(raw) as Partial<Memory>
    return { until: Number(v.until) || 0, closed: Number(v.closed) || 0 }
  } catch {
    return { until: 0, closed: 0 }
  }
}

function writeMemory(m: Memory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* almacenamiento bloqueado: en esta visita no vuelve a salir, en la siguiente sí */
  }
}

export default function InstallBanner() {
  const { t } = useLanguage()
  const pathname = usePathname() || ""
  const install = useInstallPrompt()
  const [ready, setReady] = useState(false) // pasó el tiempo de espera y no está silenciado
  const [dismissed, setDismissed] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    if (readMemory().until > Date.now()) return
    const id = window.setTimeout(() => setReady(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(id)
  }, [])

  const blocked = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const eligible = ready && !dismissed && !blocked && install.isMobile && !install.installed

  const close = () => {
    const m = readMemory()
    writeMemory({ closed: m.closed + 1, until: Date.now() + (m.closed === 0 ? 7 : 30) * DAY })
    setDismissed(true)
  }

  const press = () => {
    track("install_click", { meta: { from: "banner", mode: install.canPrompt ? "prompt" : "steps" } })
    if (install.canPrompt) install.install("banner")
    else setShowSteps((v) => !v)
  }

  if (!eligible) return null

  const steps = install.isIos ? t("welcome.installIos") : t("install.androidSteps")

  return (
    <div role="region" aria-label={t("welcome.installTitle")} className="relative z-[55] overflow-hidden" style={{ background: "linear-gradient(180deg, #0c1234 0%, #080a1c 100%)" }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
          <NocOwl size={30} seasonal={false} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold text-white">{t("welcome.installTitle")}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">{t("install.bannerSub")}</p>
        </div>
        <button
          type="button"
          onClick={press}
          aria-expanded={install.canPrompt ? undefined : showSteps}
          className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
        >
          {t("welcome.installBtn")}
        </button>
        <button type="button" onClick={close} aria-label={t("install.bannerClose")} className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {showSteps && !install.canPrompt && <p className="mx-3 mb-3 rounded-xl bg-white/[0.06] px-3.5 py-2.5 text-xs leading-snug text-zinc-200">{steps}</p>}
      {/* Misma línea de luz que la cabecera, para que franja y cabecera se lean como una sola pieza. */}
      <div aria-hidden="true" className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(108,242,242,0.55) 20%, rgba(29,107,255,0.7) 50%, rgba(168,85,247,0.55) 80%, transparent)" }} />
    </div>
  )
}
