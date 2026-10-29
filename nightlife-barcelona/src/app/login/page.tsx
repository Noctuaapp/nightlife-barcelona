"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { safeNextPath } from "../../lib/nextPath"
import { useLanguage } from "../../context/LanguageContext"
import GoogleButton from "../../components/auth/GoogleButton"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const login = async () => {
    setError("")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      // Los mensajes de Supabase vienen en inglés ("Invalid login credentials"...): se traducen
      // los habituales y se deja el original solo para lo raro.
      const m = error.message || ""
      setError(
        /invalid login credentials/i.test(m) ? t("login.errorCredentials")
        : /email not confirmed/i.test(m) ? t("login.errorNotConfirmed")
        : /rate|too many/i.test(m) ? t("login.errorTooMany")
        : m
      )
      return
    }
    // Antes, el admin siempre aterrizaba en /admin al entrar, aunque viniera a usar la web como
    // cualquier otra persona. Ahora entra igual que todo el mundo: a la portada (o a donde
    // estuviera antes de que le pidiera iniciar sesión, vía ?next=). El acceso a /admin sigue
    // ahí, en el menú, para cuando quiera ir a gestionar.
    window.location.href = safeNextPath()
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 text-ink">
        <section className="relative overflow-hidden px-4 pt-14 pb-10">
          <div className="relative mx-auto max-w-md text-center">
            <h1 className="font-display text-4xl sm:text-5xl">{t("login.title")}</h1>
            <p className="mt-4 text-zinc-400">{t("login.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-md px-4">
          <div className="rounded-card border border-white/10 bg-surface p-6 sm:p-8">

            {/* Google: primero y más llamativo (29/10/2026) */}
            <GoogleButton from="login" />

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-400">{t("login.or")}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand transition"
                placeholder={t("login.email")}
                type="email"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand transition"
                placeholder={t("login.password")}
              />
            </div>

            <p className="mt-3 text-right">
              <Link href="/recuperar" className="text-sm font-semibold text-zinc-400 underline-offset-4 hover:text-ink hover:underline">
                {t("login.forgot")}
              </Link>
            </p>

            {error && <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>}

            <button
              onClick={login}
              disabled={loading}
              className="mt-6 w-full rounded-ctl bg-brand px-6 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
            >
              {loading ? t("login.signing_in") : t("login.signin")}
            </button>

            <p className="mt-6 text-center text-sm text-zinc-400">
              <Link href="/signup" className="font-semibold text-ink underline-offset-4 hover:underline">
                {t("login.new")}
              </Link>
            </p>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}