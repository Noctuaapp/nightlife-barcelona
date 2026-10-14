"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

const REASON_CODES = ["spam", "offensive", "false_reports", "impersonation", "fake_checkins", "xp_abuse", "illegal", "other"]

export default function BlockedPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [checking, setChecking] = useState(true)
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked, block_reason, block_note")
        .eq("id", data.session.user.id)
        .maybeSingle()
      if (!profile?.is_blocked) {
        router.replace("/")
        return
      }
      setReason(profile.block_reason || null)
      setNote(profile.block_note || null)
      setChecking(false)
    }
    check()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">{t("blocked.loading")}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-card border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-3xl">
          🚫
        </div>
        <h1 className="mb-3 text-2xl font-bold">{t("blocked.title")}</h1>
        <p className="mb-4 text-sm leading-relaxed text-zinc-400">{t("blocked.body")}</p>
        {reason && REASON_CODES.includes(reason) && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-black/30 p-4 text-left">
            <p className="text-xs font-semibold text-red-300">{t("blocked.reason_label")}</p>
            <p className="mt-1 text-sm text-white">{t(`blocked.r_${reason}`)}</p>
            {note && <p className="mt-2 text-xs leading-relaxed text-zinc-400">{note}</p>}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <a
            href="/contact"
            className="w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.02]"
          >
            {t("blocked.contact")}
          </a>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 font-bold text-white transition hover:bg-white/10"
          >
            {t("blocked.logout")}
          </button>
        </div>
      </div>
    </main>
  )
}
