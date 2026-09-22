"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

export default function SignupPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password || !username) {
      setError("Por favor rellena todos los campos.")
      return
    }
    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones para continuar.")
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, country },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
      })
    }

    window.location.href = "/"
  }

  const handleGoogle = async () => {
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
            <h1 className="text-5xl font-black tracking-tight">{t("signup.title")}</h1>
            <p className="mt-4 text-zinc-400">{t("signup.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-md px-4">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

            {/* Google */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white hover:text-black"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("signup.google")}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">{t("signup.or")}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                placeholder={t("signup.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />
              <input
                type="email"
                placeholder={t("signup.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />
              <input
                type="password"
                placeholder={t("signup.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />
              <input
                type="text"
                placeholder={t("signup.country")}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-purple-500 flex-shrink-0"
                />
                <span className="text-sm text-zinc-400 leading-relaxed">
                  Acepto los{" "}
                  <a href="/terms" className="text-purple-400 hover:text-purple-300 transition">términos y condiciones</a>
                  {" "}y la{" "}
                  <a href="/privacy" className="text-purple-400 hover:text-purple-300 transition">política de privacidad</a>
                  {" "}de Noctua, incluyendo el uso de mi ubicación para mostrar contenido relevante.
                </span>
              </label>

              {error && <p className="text-sm font-bold text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? t("signup.creating") : t("signup.create")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              <Link href="/login" className="text-white hover:text-zinc-300 transition">
                {t("signup.existing")}
              </Link>
            </p>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}