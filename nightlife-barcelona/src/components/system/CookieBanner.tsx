"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage } from "../../context/LanguageContext"
import { useConsent } from "../../lib/useConsent"
import { OPEN_CONSENT_EVENT, saveConsent } from "../../lib/consent"

// Banner de cookies (30/10/2026). Pide permiso solo para lo opcional: la marca que recuerda qué se
// votó en la encuesta del día cuando no hay cuenta (lib/consent.ts). Lo imprescindible (sesión,
// idioma) y la analítica propia, que no guarda nada en el dispositivo, no lo necesitan.
//
// Criterios: «Aceptar» y «Rechazar» con el mismo tamaño y el mismo aspecto (que rechazar sea tan
// fácil como aceptar); nada marcado de antemano; no tapa la página (es una tarjeta, no un muro); y se
// puede cambiar la decisión cuando se quiera desde «Preferencias de cookies» en el pie de página.
// No sale en el admin. Hasta que se lee el navegador (`ready`) no se pinta nada, para no romper la
// hidratación ni parpadear a quien ya decidió.
export default function CookieBanner() {
  const { t } = useLanguage()
  const pathname = usePathname() || ""
  const consent = useConsent()
  const [reopened, setReopened] = useState(false)

  useEffect(() => {
    const open = () => setReopened(true)
    window.addEventListener(OPEN_CONSENT_EVENT, open)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open)
  }, [])

  if (!consent.ready || pathname.startsWith("/admin")) return null
  if (consent.decided && !reopened) return null

  const choose = (optional: boolean) => {
    saveConsent(optional)
    setReopened(false)
  }

  const buttonClass =
    "flex-1 rounded-ctl border border-white/25 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/[0.14] active:scale-95"

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[900] flex justify-center px-4 md:bottom-24 md:justify-start md:px-6">
      <div
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-text"
        className="pointer-events-auto w-full max-w-md rounded-card border border-white/10 bg-surface p-5 shadow-2xl"
      >
        <p id="cookie-banner-title" className="font-display text-lg text-ink">
          {t("cookieBanner.title")}
        </p>
        <p id="cookie-banner-text" className="mt-2 text-sm leading-relaxed text-zinc-300">
          {t("cookieBanner.text")}{" "}
          <Link href="/privacy#cookies" className="font-semibold text-brand-soft underline underline-offset-2 hover:text-ink">
            {t("cookieBanner.more")}
          </Link>
        </p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => choose(false)} className={buttonClass}>
            {t("cookieBanner.reject")}
          </button>
          <button type="button" onClick={() => choose(true)} className={buttonClass}>
            {t("cookieBanner.accept")}
          </button>
        </div>
      </div>
    </div>
  )
}
