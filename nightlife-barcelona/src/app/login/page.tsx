"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

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
    if (error) { setError(error.message); return }
    if (email === "info@noctuaapp.com") {
      window.location.href = "/admin"
    } else {
      window.location.href = "/"
    }
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="relative overflow-hidden px-4 pt-14 pb-10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md text-center">
            <h1 className="text-5xl font-black tracking-tight">{t("login.title")}</h1>
            <p className="mt-4 text-zinc-400">{t("login.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-md px-4">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

            {/* Google */}
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white hover:text-black"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("login.google")}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">{t("login.or")}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
                placeholder={t("login.email")}
                type="email"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
                placeholder={t("login.password")}
              />
            </div>

            {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}

            <button
              onClick={login}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? t("login.signing_in") : t("login.signin")}
            </button>

            <p className="mt-6 text-center text-sm text-zinc-500">
              <Link href="/signup" className="text-white hover:text-zinc-300 transition">
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