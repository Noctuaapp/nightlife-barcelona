"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

// «¿Has olvidado tu contraseña?» (26/10/2026). Antes no existía: quien la olvidaba no tenía forma
// de volver a entrar salvo escribir a soporte. Ahora se pide un enlace por email (lo envía
// Supabase); al pulsarlo se abre /profile/change-password?recovery=1 con la sesión ya iniciada
// para poner una nueva. Por seguridad, el mensaje es el mismo exista o no la cuenta (así nadie
// puede usar esta página para averiguar qué emails están registrados).
export default function RecoverPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const send = async () => {
    setError("")
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError(t("recover.invalidEmail"))
      return
    }
    setSending(true)
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/profile/change-password?recovery=1`,
    })
    setSending(false)
    // Límite de envíos de Supabase (varios intentos seguidos): sí se avisa, es útil y no revela nada.
    if (error && /rate|seconds|too many/i.test(error.message)) {
      setError(t("recover.tooMany"))
      return
    }
    setSent(true)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 text-ink">
        <section className="px-4 pb-10 pt-14">
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-display text-4xl sm:text-5xl">{t("recover.title")}</h1>
            <p className="mt-4 text-zinc-400">{t("recover.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-md px-4">
          <div className="rounded-card border border-white/10 bg-surface p-6 sm:p-8">
            {sent ? (
              <div className="text-center">
                <p className="text-4xl" aria-hidden="true">📬</p>
                <p className="mt-3 font-semibold text-ink">{t("recover.sentTitle")}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("recover.sentBody").replace("{email}", email.trim())}</p>
                <button type="button" onClick={() => setSent(false)} className="mt-5 text-sm font-semibold text-brand-soft hover:underline">
                  {t("recover.tryAgain")}
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="recover-email" className="mb-2 block text-sm text-zinc-300">
                  {t("login.email")}
                </label>
                <input
                  id="recover-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none transition focus:border-brand"
                  placeholder="tu@email.com"
                />
                {error && <p className="mt-3 text-sm font-semibold text-red-300">{error}</p>}
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="mt-5 w-full rounded-ctl bg-brand px-6 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
                >
                  {sending ? t("recover.sending") : t("recover.send")}
                </button>
                <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">{t("recover.googleNote")}</p>
              </>
            )}
            <p className="mt-6 text-center text-sm">
              <Link href="/login" className="font-semibold text-zinc-300 underline-offset-4 hover:underline">
                {t("recover.back")}
              </Link>
            </p>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
