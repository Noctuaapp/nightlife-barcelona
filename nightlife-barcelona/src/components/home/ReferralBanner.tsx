"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Icon from "../ui/Icon"
import { useLanguage } from "../../context/LanguageContext"
import { supabase } from "../../lib/supabase"

const KEY = "noctua_ref"

// Recoge el código de invitación (?ref=xxxx), lo guarda hasta que la persona tenga cuenta y
// lo canjea al primer inicio de sesión. Mientras no tenga cuenta, enseña un aviso de bienvenida.
export default function ReferralBanner() {
  const { t } = useLanguage()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const run = async () => {
      let code: string | null = null
      try {
        const fromUrl = new URLSearchParams(window.location.search).get("ref")
        if (fromUrl && /^[a-f0-9]{8}$/.test(fromUrl)) localStorage.setItem(KEY, fromUrl)
        code = localStorage.getItem(KEY)
      } catch {}
      if (!code) return

      const { data } = await supabase.auth.getUser()
      if (!data.user) { setPending(true); return }

      try { await supabase.rpc("claim_referral", { p_code: code }) } catch {}
      try { localStorage.removeItem(KEY) } catch {}
    }
    run()
  }, [])

  if (!pending) return null
  return (
    <div className="mb-4 flex items-center gap-3 rounded-card border border-warn/30 bg-warn/10 p-4">
      <Icon name="ticket" className="h-6 w-6 shrink-0 text-warn" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">{t("referral.bannerTitle")}</p>
        <p className="text-xs text-zinc-300">{t("referral.bannerBody")}</p>
      </div>
      <Link href="/signup" className="shrink-0 rounded-ctl bg-ink px-4 py-2 text-xs font-semibold text-night">
        {t("referral.bannerCta")}
      </Link>
    </div>
  )
}
