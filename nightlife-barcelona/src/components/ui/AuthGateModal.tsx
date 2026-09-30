"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

import { useLanguage } from "../../context/LanguageContext"

type AuthGateModalProps = {
  open: boolean
  onClose: () => void
  // Clave i18n del subtítulo específico de la función que abre el modal (favoritos, plan con
  // IA, locales cercanos...). Si no se pasa, se muestra solo el título genérico.
  subtitleKey?: string
}

// Modal reutilizable de "Regístrate y disfruta de todo Noctua". Sustituye al patrón anterior de
// redirigir directamente a /login sin explicar nada (usado en toggleFavorite, plan/page, etc.):
// aquí se explica qué se gana registrándose y se ofrece registro o login, sin sacar a la persona
// de golpe de lo que estaba mirando. Portal a document.body por la misma razón que
// NearbyVenuesSheet: un ancestro con backdrop-blur crea un containing block para position:fixed
// y el modal quedaría atrapado dentro de esa tarjeta en vez de cubrir la pantalla.
export default function AuthGateModal({ open, onClose, subtitleKey }: AuthGateModalProps) {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  const benefits = [
    t("authGate.benefit1"),
    t("authGate.benefit2"),
    t("authGate.benefit3"),
    t("authGate.benefit4"),
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-xl sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[32px] border border-white/10 bg-[#0b0912] p-7 sm:rounded-[32px]"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-4xl">✨</p>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-black leading-tight text-white">{t("authGate.title")}</h2>
        {subtitleKey && <p className="mt-2 text-sm text-zinc-400">{t(subtitleKey)}</p>}

        <div className="mt-5 space-y-2.5">
          {benefits.map((b) => (
            <div key={b} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              {b}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/signup"
            className="rounded-2xl py-4 text-center font-black text-white transition hover:scale-[1.01] hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
          >
            {t("authGate.ctaSignup")}
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-white/10 bg-white/5 py-4 text-center font-bold text-white transition hover:bg-white/10"
          >
            {t("authGate.ctaLogin")}
          </Link>
          <button onClick={onClose} className="py-1 text-center text-xs font-semibold text-zinc-500 transition hover:text-zinc-300">
            {t("authGate.maybeLater")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
