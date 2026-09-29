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

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="mx-auto max-w-3xl px-4 pt-14">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            {t("changePassword.eyebrow")}
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight">
            {t("changePassword.title")}
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            {t("changePassword.subtitle")}
          </p>

          <div className="mt-10 rounded-[36px] border border-white/10 bg-white/[0.03] p-8">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={t("changePassword.newPassword")}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
            />

            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder={t("changePassword.confirmPassword")}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
            />

            {error && (
              <p className="mt-4 text-sm font-bold text-red-400">
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
              className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
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
