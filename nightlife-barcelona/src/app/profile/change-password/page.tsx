"use client"

import { useState } from "react"
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

  const changePassword = async () => {
    setSuccess("")
    setError("")

    if (!password || !confirmPassword) {
      setError(t("changePassword.errorFillBoth"))
      return
    }

    if (password.length < 6) {
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
      setError(error.message)
      return
    }

    setSuccess(t("changePassword.success"))
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
            {t("changePassword.subtitle")}
          </p>

          <div className="mt-10 rounded-card border border-white/10 bg-white/[0.03] p-8">
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
