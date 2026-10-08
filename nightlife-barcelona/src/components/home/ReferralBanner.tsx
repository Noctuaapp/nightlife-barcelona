"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

const KEY = "noctua_ref"

// Recoge el código de invitación (?ref=xxxx), lo guarda hasta que la persona tenga cuenta y
// lo canjea al primer inicio de sesión. Mientras no tenga cuenta, enseña un aviso de bienvenida.
export default function ReferralBanner() {
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
    <div className="mb-4 flex items-center gap-3 rounded-3xl border border-amber-400/30 bg-amber-500/10 p-4">
      <span className="text-3xl">🎟️</span>
      <div className="flex-1">
        <p className="text-sm font-black text-white">Un amigo te ha invitado a Noctua</p>
        <p className="text-xs text-zinc-300">Crea tu cuenta y haz tu primer check-in: +25 XP de bienvenida para ti y +50 para él.</p>
      </div>
      <Link href="/signup" className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-black text-black">Crear cuenta</Link>
    </div>
  )
}
