"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import NocOwl from "../mascot/NocOwl"

type LoginWallProps = {
  // Claves i18n del título y del texto propios de la función (mapa, plan…).
  titleKey: string
  subtitleKey: string
  // Ruta a la que volver después de entrar o registrarse. Por defecto, la página actual
  // (con sus parámetros, p. ej. /map?club=…).
  next?: string
}

// Pantalla para las funciones solo de miembros (mapa y Planifica tu noche). Explica qué se gana
// con la cuenta y lleva a registro o login con ?next= para volver directamente aquí.
export default function LoginWall({ titleKey, subtitleKey, next }: LoginWallProps) {
  const { t } = useLanguage()
  const back = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")
  const q = `?next=${encodeURIComponent(back)}`
  const benefits = [t("authGate.benefit2"), t("authGate.benefit1"), t("authGate.benefit3")]

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-night px-4 pb-32 pt-16 text-ink">
      <div className="w-full max-w-sm">
        <NocOwl size={56} mood="wink" />
        <h1 className="mt-5 font-display text-[2rem] leading-[1.08]">{t(titleKey)}</h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-300">{t(subtitleKey)}</p>

        <ul className="mt-6 space-y-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <Check size={16} className="mt-0.5 shrink-0 text-brand-soft" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/signup${q}`}
            className="rounded-ctl bg-brand py-4 text-center text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            {t("authGate.ctaSignup")}
          </Link>
          <Link
            href={`/login${q}`}
            className="rounded-ctl border border-white/15 bg-white/5 py-4 text-center text-sm font-semibold text-ink transition hover:bg-white/10"
          >
            {t("authGate.ctaLogin")}
          </Link>
        </div>
      </div>
    </main>
  )
}
