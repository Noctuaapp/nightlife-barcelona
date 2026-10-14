"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import ArrowIcon from "../../components/ui/ArrowIcon"
import TermsText from "../../components/ui/TermsText"
import { useLanguage } from "../../context/LanguageContext"

export default function ConfirmAgePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmedAge, setConfirmedAge] = useState(false)
  const [birthDate, setBirthDate] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted_at")
        .eq("id", data.session.user.id)
        .maybeSingle()
      if (profile?.terms_accepted_at) {
        router.replace("/")
        return
      }
      setUserId(data.session.user.id)
      setChecking(false)
    }
    check()
  }, [router])

  const handleConfirm = async () => {
    setError("")
    if (!acceptedTerms || !confirmedAge) {
      setError(t("consent.checkBoth"))
      return
    }
    if (!birthDate) {
      setError(t("consent.birthDateRequired"))
      return
    }
    const bd = new Date(birthDate + "T00:00:00")
    const today = new Date()
    let age = today.getFullYear() - bd.getFullYear()
    if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--
    if (isNaN(age) || age < 18) {
      setError(t("consent.under18"))
      return
    }
    if (!userId) return
    setSaving(true)
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: userId,
      terms_accepted_at: new Date().toISOString(),
      birth_year: bd.getFullYear(),
    })
    setSaving(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    router.replace("/")
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-night text-white">
        <p className="text-sm text-zinc-400">{t("common.loading")}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-night px-4 text-white">
      <div className="w-full max-w-md rounded-card border border-white/10 bg-surface p-8">
        <h1 className="mb-3 text-2xl font-semibold">{t("consent.title")}</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-300">{t("consent.body")}</p>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-[#7c5cff]"
            />
            <span className="text-sm leading-relaxed text-zinc-400">
              <TermsText newTab />
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmedAge}
              onChange={(e) => setConfirmedAge(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-[#7c5cff]"
            />
            <span className="text-sm leading-relaxed text-zinc-400">{t("consent.ageConfirm")}</span>
          </label>
        </div>

        <div className="mt-5">
          <label className="mb-2 block px-1 text-sm text-zinc-300">{t("consent.birthDate")}</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
            style={{ colorScheme: "dark" }}
            className="w-full rounded-ctl border border-white/15 bg-night px-5 py-4 text-zinc-300 outline-none transition focus:border-brand"
          />
          <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
            {t("birthYear.help")}
          </p>
        </div>

        {error && <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-ctl bg-brand py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {saving ? t("profile.saving") : (<>{t("consent.continue")} <ArrowIcon className="h-4 w-4" /></>)}
        </button>
      </div>
    </main>
  )
}
