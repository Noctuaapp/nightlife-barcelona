"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import NocOwl from "@/components/mascot/NocOwl"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { Share2, Check } from "lucide-react"

type Info = { code: string; invited: number; active: number }

export default function InvitarPage() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading")
  const [info, setInfo] = useState<Info | null>(null)
  const [copied, setCopied] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setState("login"); return }
      const { data: i, error } = await supabase.rpc("my_referral_info")
      if (error || !i) { setState("error"); return }
      setInfo(i as Info)
      setState("ready")
    }
    load()
  }, [])

  const link = info ? `${typeof window !== "undefined" ? window.location.origin : "https://www.noctuaapp.com"}/?ref=${info.code}` : ""
  const text = t("invite.shareText")

  const share = async () => {
    if (!info) return
    if (navigator.share) {
      try { await navigator.share({ title: "Noctua", text, url: link }); return } catch (e: any) { if (e?.name === "AbortError") return }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${link}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  return (
    <div className="flex min-h-screen flex-col bg-night text-ink">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-8 sm:pt-12">
        {state === "loading" && <p className="py-24 text-center text-zinc-400">{t("common.loading")}</p>}

        {state === "login" && (
          <div className="py-20 text-center">
            <div className="mx-auto w-fit"><NocOwl size={80} mood="wink" /></div>
            <h1 className="font-display mt-4 text-2xl">{t("invite.title")}</h1>
            <p className="mt-2 text-sm text-zinc-400">{t("invite.loginHint")}</p>
            <Link href="/login?next=/invitar" className="mt-6 inline-block rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white">{t("nav.login")}</Link>
          </div>
        )}

        {state === "error" && <p className="py-24 text-center text-zinc-400">{t("invite.error")}</p>}

        {state === "ready" && info && (
          <div>
            <div className="flex items-center gap-3">
              <NocOwl size={60} mood="party" />
              <div>
                <h1 className="font-display text-2xl">{t("invite.title")}</h1>
                <p className="text-sm text-zinc-400">{t("invite.subtitle")}</p>
              </div>
            </div>

            <div className="mt-6 rounded-card border border-white/10 bg-surface p-5">
              <p className="text-sm font-semibold text-ink">{t("invite.yourLink")}</p>
              <p className="mt-2 break-all rounded-ctl bg-night px-3 py-3 text-sm text-zinc-300">{link}</p>
              <button onClick={share} className="mt-3 flex w-full items-center justify-center gap-2 rounded-ctl bg-brand py-3 text-sm font-semibold text-white active:scale-95">
                {copied ? <><Check size={16} /> {t("clubPage.linkCopied")}</> : <><Share2 size={16} /> {t("invite.shareLink")}</>}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-card border border-white/10 bg-surface p-4">
                <dd className="text-3xl font-semibold text-ink">{info.invited}</dd>
                <dt className="text-xs text-zinc-400">{info.invited === 1 ? t("invite.joinedOne") : t("invite.joinedMany")}</dt>
              </div>
              <div className="rounded-card border border-white/10 bg-surface p-4">
                <dd className="text-3xl font-semibold text-open">{info.active}</dd>
                <dt className="text-xs text-zinc-400">{info.active === 1 ? t("invite.activeOne") : t("invite.activeMany")}</dt>
              </div>
            </dl>

            <div className="mt-6 rounded-card border border-white/10 bg-surface p-5">
              <h2 className="text-base font-semibold text-ink">{t("invite.howTitle")}</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-300">
                <li>{t("invite.how1")}</li>
                <li>{t("invite.how2")}</li>
                <li>{t("invite.how3")}</li>
              </ol>
              <p className="mt-3 text-xs text-zinc-400">{t("invite.howNote")}</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
