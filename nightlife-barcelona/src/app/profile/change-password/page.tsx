"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"

import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"

export default function ChangePasswordPage() {
  const { t } = useLanguage()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  // Llegada desde el email de «He olvidado mi contraseña» (/recuperar): ?recovery=1. Supabase
  // abre la sesión solo con el enlace; si ha caducado o ya se usó, no hay sesión y se avisa.
  const [recovery, setRecovery] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const fromEmail = new URLSearchParams(window.location.search).get("recovery") === "1"
    setRecovery(fromEmail)
    const check = () =>
      supabase.auth.getSession().then(({ data }) => setHasSession((prev) => prev === true || !!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true)
      if (session) setHasSession(true)
    })
    // Dejamos un momento para que Supabase procese el enlace del email antes de decidir.
    const timer = window.setTimeout(check, fromEmail ? 1500 : 0)
    return () => {
      sub.subscription.unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  const changePassword = async () => {
    setSuccess("")
    setError("")

    if (!password || !confirmPassword) {
      setError(t("changePassword.errorFillBoth"))
      return
    }

    if (password.length < 8) {
      setError(t("changePassword.errorMinLength"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("changePassword.errorMismatch"))
      return
    }

    setSaving(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setSaving(false)

    if (error) {
      setError(/different from the old/i.test(error.message) ? t("changePassword.errorSame") : error.message)
      return
    }

    setSuccess(t("changePassword.success"))
    if (recovery) window.setTimeout(() => (window.location.href = "/"), 1500)
    setPassword("")
    setConfirmPassword("")
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-night pb-40 text-ink">
        <section className="mx-auto max-w-3xl px-4 pt-14">
          <p className="text-sm text-zinc-400">
            {t("changePassword.eyebrow")}
          </p>

          <h1 className="font-display mt-4 text-4xl sm:text-5xl">
            {t("changePassword.title")}
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            {recovery ? t("changePassword.recoverySubtitle") : t("changePassword.subtitle")}
          </p>

          {hasSession === false && (
            <div className="mt-10 rounded-card border border-warn/40 bg-warn/10 p-6 text-sm text-warn">
              <p className="font-semibold">{recovery ? t("changePassword.linkExpired") : t("changePassword.needLogin")}</p>
              <Link href={recovery ? "/recuperar" : "/login?next=/profile/change-password"} className="mt-3 inline-block font-bold text-ink underline underline-offset-4">
                {recovery ? t("changePassword.requestNew") : t("login.signin")}
              </Link>
            </div>
          )}

          <div className={`mt-10 rounded-card border border-white/10 bg-white/[0.03] p-8 ${hasSession === false ? "hidden" : ""}`}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={t("changePassword.newPassword")}
              className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand"
            />

            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder={t("changePassword.confirmPassword")}
              className="mt-4 w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand"
            />

            {error && (
              <p className="mt-4 text-sm font-semibold text-red-300">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-4 text-sm font-bold text-emerald-300">
                {success}
              </p>
            )}

            <button
              onClick={changePassword}
              disabled={saving}
              className="mt-6 w-full rounded-ctl bg-brand px-6 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
            >
              {saving ? t("changePassword.updating") : t("changePassword.update")}
            </button>

            <Link
              href="/profile"
              className="mt-5 block text-center text-sm font-bold text-zinc-400 hover:text-white"
            >
              {t("changePassword.back")}
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </>
  )
}
