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
// Solo se pinta en móvil y mientras la app no esté ya instalada. Cada pulsación se anota como
// "install_click" con de dónde vino (menu | profile).

type Props = {
  from: "menu" | "profile"
  variant: "menu" | "card"
  /** Para cerrar el menú tras abrir el cuadro de instalación. */
  onDone?: () => void
  cardClass?: string
  titleClass?: string
}

export default function InstallAppButton({ from, variant, onDone, cardClass = "", titleClass = "" }: Props) {
  const { t } = useLanguage()
  const install = useInstallPrompt()
  const [showSteps, setShowSteps] = useState(false)

  if (install.installed || !install.isMobile || !(install.canPrompt || install.isIos)) return null

  const press = () => {
    track("install_click", { meta: { from } })
    if (install.canPrompt) {
      install.install()
      onDone?.()
    } else {
      setShowSteps((v) => !v)
    }
  }

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={press}
          className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <Smartphone size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />
          {t("welcome.installTitle")}
        </button>
        {showSteps && (
          <p className="mx-2 mb-2 rounded-xl bg-white/5 px-4 py-3 text-xs leading-snug text-zinc-300">{t("welcome.installIos")}</p>
        )}
      </>
    )
  }

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3">
        <Smartphone size={22} strokeWidth={1.7} className="mt-0.5 shrink-0 text-brand-soft" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className={titleClass}>{t("welcome.installTitle")}</h2>
          <p className="mt-1.5 text-sm leading-snug text-zinc-400">{t("install.body")}</p>
          {install.canPrompt ? (
            <button
              type="button"
              onClick={press}
              className="mt-4 rounded-ctl bg-white px-5 py-2.5 text-sm font-bold text-night transition hover:opacity-90"
            >
              {t("welcome.installBtn")}
            </button>
          ) : (
            <p className="mt-3 rounded-ctl bg-white/5 px-3.5 py-3 text-xs leading-snug text-zinc-300">{t("welcome.installIos")}</p>
          )}
        </div>
      </div>
    </div>
  )
}
