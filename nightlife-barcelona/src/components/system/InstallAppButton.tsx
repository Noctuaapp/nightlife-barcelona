"use client"

import { useState } from "react"
import { Smartphone } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { useInstallPrompt } from "../../lib/useInstallPrompt"
import { track } from "../../lib/track"

// «Instalar Noctua» siempre a mano (27/10/2026). Hasta ahora el botón de instalar solo salía dentro
// de «Tu primer reto» (cuentas nuevas), y como Chrome ya no enseña su propio aviso, casi nadie
// sabía que se podía instalar. Este botón vive en el menú ☰ y en Perfil:
//  · Android/Chrome: abre directamente el cuadro de instalación del navegador.
//  · iPhone/iPad (Safari no tiene ese cuadro): despliega los dos pasos a mano.
//  · Android donde Chrome todavía no ha dado el aviso de instalar (decide él cuándo): despliega
//    los pasos a mano del menú ⋮ — así el botón sale siempre en móvil y nunca "desaparece".
// Solo se pinta en móvil y mientras la app no esté ya instalada. Cada pulsación se anota como
// "install_click" con de dónde vino (menu | profile | join) y si abrió el cuadro o los pasos.

type Props = {
  from: "menu" | "profile" | "join"
  variant: "menu" | "card" | "inline"
  /** Para cerrar el menú tras abrir el cuadro de instalación. */
  onDone?: () => void
  cardClass?: string
  titleClass?: string
}

export default function InstallAppButton({ from, variant, onDone, cardClass = "", titleClass = "" }: Props) {
  const { t } = useLanguage()
  const install = useInstallPrompt()
  const [showSteps, setShowSteps] = useState(false)

  if (install.installed || !install.isMobile) return null

  const stepsText = install.isIos ? t("welcome.installIos") : t("install.androidSteps")

  const press = () => {
    track("install_click", { meta: { from, mode: install.canPrompt ? "prompt" : "steps" } })
    if (install.canPrompt) {
      install.install(from)
      onDone?.()
    } else {
      setShowSteps((v) => !v)
    }
  }

  if (variant === "menu") {
    return (
      <>
        {/* Destacado a propósito (27/10/2026): es la única entrada del menú con color propio, para que
            se vea que instalar la app es algo que conviene hacer. */}
        <button
          type="button"
          onClick={press}
          className="my-1 flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-left text-[13px] font-bold text-white ring-1 ring-fuchsia-400/50 transition hover:brightness-110"
          style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.30) 0%, rgba(236,72,153,0.24) 100%)" }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
          >
            <Smartphone size={17} strokeWidth={2} className="text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">{t("welcome.installTitle")}</span>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-night">{t("welcome.installBtn")}</span>
        </button>
        {showSteps && (
          <p className="mx-2 mb-2 rounded-xl bg-white/5 px-4 py-3 text-xs leading-snug text-zinc-300">{stepsText}</p>
        )}
      </>
    )
  }

  if (variant === "inline") {
    // Dentro de «¿Aún no estás dentro?» (bloque de registro de clubs y eventos): en cian y con el
    // botón solo de contorno, a propósito, para que se vea sin competir con «Crear cuenta gratis»
    // (degradado morado-rosa). Instalar la app facilita luego crear la cuenta y volver.
    return (
      <div className="relative mt-3">
        <button
          type="button"
          onClick={press}
          className="flex w-full items-center gap-2.5 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2.5 text-left transition hover:bg-cyan-400/15"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/20">
            <Smartphone size={17} strokeWidth={2} className="text-cyan-300" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-ink">{t("welcome.installTitle")}</span>
          <span className="shrink-0 rounded-full border border-cyan-300/50 px-2.5 py-1 text-[11px] font-bold text-cyan-200">
            {t("welcome.installBtn")}
          </span>
        </button>
        {showSteps && (
          <p className="mt-2 rounded-xl bg-white/5 px-4 py-3 text-xs leading-snug text-zinc-300">{stepsText}</p>
        )}
      </div>
    )
  }

  return (
    <div className={`${cardClass} ring-1 ring-fuchsia-400/40`} style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.10) 100%)" }}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
        >
          <Smartphone size={20} strokeWidth={2} className="text-white" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={titleClass}>{t("welcome.installTitle")}</h2>
          <p className="mt-1.5 text-sm leading-snug text-zinc-400">{t("install.body")}</p>
          {install.canPrompt ? (
            <button
              type="button"
              onClick={press}
              className="mt-4 rounded-ctl px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
            >
              {t("welcome.installBtn")}
            </button>
          ) : (
            <p className="mt-3 rounded-ctl bg-white/5 px-3.5 py-3 text-xs leading-snug text-zinc-300">{stepsText}</p>
          )}
        </div>
      </div>
    </div>
  )
}
