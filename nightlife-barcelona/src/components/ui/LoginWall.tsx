"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import NocOwl from "../mascot/NocOwl"
import GoogleButton from "../auth/GoogleButton"

type LoginWallProps = {
  // Claves i18n del título y del texto propios de la función (mapa, plan, favoritos, perfil…).
  titleKey: string
  subtitleKey: string
  // Ruta a la que volver después de entrar o registrarse. Por defecto, la página actual
  // (con sus parámetros, p. ej. /map?club=…).
  next?: string
}

// Pantalla para las zonas privadas (mapa, Planifica tu noche, favoritos, perfil). Rediseñada el
// 29/10/2026: lo primero y más llamativo es «Continuar con Google» (un toque, sin contraseña ni
// formulario); debajo, crear cuenta con email, y «Iniciar sesión» para quien ya tiene cuenta. Todo
// lleva ?next= para volver directamente aquí.
export default function LoginWall({ titleKey, subtitleKey, next }: LoginWallProps) {
  const { t } = useLanguage()
  const back = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")
  const q = `?next=${encodeURIComponent(back)}`
  const benefits = [t("authGate.benefit2"), t("authGate.benefit1"), t("authGate.benefit3")]

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-night px-4 pb-32 pt-16 text-ink">
      {/* Luz de fondo: dos manchas suaves del degradado de marca */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-card border border-white/10 bg-surface/80 p-6 shadow-[0_30px_80px_-30px_rgba(124,92,255,0.45)] backdrop-blur sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white/[0.06] p-1.5">
            <NocOwl size={44} mood="wink" />
          </div>
        </div>
        <h1 className="mt-5 font-display text-[1.9rem] leading-[1.08]">{t(titleKey)}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-300">{t(subtitleKey)}</p>

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

        <div className="mt-7">
          <GoogleButton from="wall" next={back} />
          <p className="mt-2.5 text-center text-xs text-zinc-400">{t("authGate.googleHint")}</p>
        </div>

        <div className="my-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-zinc-500">{t("signup.or")}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Link
          href={`/signup${q}`}
          className="flex w-full items-center justify-center rounded-ctl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"
        >
          {t("authGate.ctaEmail")}
        </Link>
        <p className="mt-5 text-center text-sm text-zinc-400">
          {t("authGate.haveAccount")}{" "}
          <Link href={`/login${q}`} className="font-semibold text-ink underline-offset-4 hover:underline">
            {t("authGate.loginLink")}
          </Link>
        </p>
      </div>
    </main>
  )
}
