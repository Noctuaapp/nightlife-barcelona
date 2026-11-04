"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

import { useLanguage } from "../../context/LanguageContext"
import { Check, X } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import GoogleButton from "../auth/GoogleButton"
import { XP_AMOUNTS } from "../../lib/xp"

// Acciones que piden cuenta desde una ficha (03/11/2026). Cada una enseña un título propio («Crea tu
// cuenta para guardarlo») y solo lo que de verdad se gana con ella: XP del check-in (XP_AMOUNTS), el
// primer reto de bienvenida (guardar 3 sitios) y «Tu mes en Noctua» (que cuenta check-ins y «voy»).
// Nada de promesas que la web no cumpla.
export type AuthGateReason = "favorite" | "attend" | "checkin"

const REASONS: Record<AuthGateReason, { title: string; subtitle: string; benefits: string[] }> = {
  favorite: {
    title: "authGate.titleFavorite",
    subtitle: "authGate.subtitleFavorites",
    benefits: ["authGate.benefitChallenge", "authGate.benefitXp", "authGate.benefitMonth"],
  },
  attend: {
    title: "authGate.titleAttend",
    subtitle: "authGate.subtitleAttend",
    benefits: ["authGate.benefitGoing", "authGate.benefitXp", "authGate.benefitMonth"],
  },
  checkin: {
    title: "authGate.titleCheckin",
    subtitle: "authGate.subtitleCheckin",
    benefits: ["authGate.benefitXp", "authGate.benefitMonth", "authGate.benefitChallenge"],
  },
}

type AuthGateModalProps = {
  open: boolean
  onClose: () => void
  // Clave i18n del subtítulo específico de la función que abre el modal (favoritos, plan con
  // IA, locales cercanos...). Si no se pasa, se muestra solo el título genérico.
  subtitleKey?: string
  // Si se indica, el modal habla de esa acción concreta (título, subtítulo y ventajas propios).
  reason?: AuthGateReason
}

// Modal reutilizable de "Regístrate y disfruta de todo Noctua". Sustituye al patrón anterior de
// redirigir directamente a /login sin explicar nada (usado en toggleFavorite, plan/page, etc.):
// aquí se explica qué se gana registrándose y se ofrece registro o login, sin sacar a la persona
// de golpe de lo que estaba mirando. Portal a document.body por la misma razón que
// NearbyVenuesSheet: un ancestro con backdrop-blur crea un containing block para position:fixed
// y el modal quedaría atrapado dentro de esa tarjeta en vez de cubrir la pantalla.
export default function AuthGateModal({ open, onClose, subtitleKey, reason }: AuthGateModalProps) {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  const ctx = reason ? REASONS[reason] : null
  const fill = (text: string) => text.replace("{xp}", String(XP_AMOUNTS.checkin))
  const title = t(ctx ? ctx.title : "authGate.title")
  const subtitle = subtitleKey ? t(subtitleKey) : ctx ? fill(t(ctx.subtitle)) : null
  const benefits = ctx
    ? ctx.benefits.map((key) => fill(t(key)))
    : [t("authGate.benefit1"), t("authGate.benefit2"), t("authGate.benefit3"), t("authGate.benefit4")]

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-xl sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-card border border-white/10 bg-night p-6 sm:rounded-card sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <NocOwl size={44} mood="wink" />
          <button
            onClick={onClose}
            aria-label={t("clubPage.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-black leading-tight text-white">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}

        <ul className="mt-5 space-y-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
              >
                <Check size={12} strokeWidth={3} className="text-white" aria-hidden="true" />
              </span>
              {b}
            </li>
          ))}
        </ul>

        {/* 29/10/2026: «Continuar con Google» primero y llamativo (un toque, sin formulario); debajo,
            crear cuenta con email y entrar. Todo vuelve a la página en la que estabas. */}
        <div className="mt-6 flex flex-col gap-3">
          <GoogleButton from="modal" next={typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"} />
          <p className="-mt-1 text-center text-xs text-zinc-400">{t("authGate.googleHint")}</p>
          <Link
            href={`/signup?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
            className="btn-pill btn-secondary py-3.5 text-center text-sm"
          >
            {t("authGate.ctaEmail")}
          </Link>
          <p className="text-center text-sm text-zinc-400">
            {t("authGate.haveAccount")}{" "}
            <Link
              href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              {t("authGate.loginLink")}
            </Link>
          </p>
          <button onClick={onClose} className="py-1 text-center text-xs font-semibold text-zinc-400 transition hover:text-zinc-300">
            {t("authGate.maybeLater")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
