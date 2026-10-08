"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import NocOwl from "@/components/mascot/NocOwl"
import { supabase } from "../../lib/supabase"

type Info = { code: string; invited: number; active: number }

export default function InvitarPage() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading")
  const [info, setInfo] = useState<Info | null>(null)
  const [copied, setCopied] = useState(false)

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
  const text = "Me estoy montando las noches de Barcelona con Noctua 🦉 Únete con mi enlace y los dos ganamos XP:"

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
    <div className="flex min-h-screen flex-col bg-[#050308]">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-24">
        {state === "loading" && <p className="py-24 text-center text-zinc-500">Cargando…</p>}

        {state === "login" && (
          <div className="py-20 text-center">
            <div className="mx-auto w-fit"><NocOwl size={80} mood="wink" /></div>
            <h1 className="mt-4 text-2xl font-black text-white">Invita a un amigo</h1>
            <p className="mt-2 text-sm text-zinc-400">Inicia sesión para conseguir tu enlace de invitación.</p>
            <Link href="/login" className="mt-6 inline-block rounded-2xl bg-white px-6 py-3 text-sm font-black text-black">Entrar</Link>
          </div>
        )}

        {state === "error" && <p className="py-24 text-center text-zinc-400">No he podido cargar tu enlace. Prueba de nuevo en un momento.</p>}

        {state === "ready" && info && (
          <div>
            <div className="flex items-center gap-3">
              <NocOwl size={64} mood="party" />
              <div>
                <h1 className="text-2xl font-black text-white">Invita a un amigo</h1>
                <p className="text-sm text-zinc-400">Los dos ganáis XP.</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-black/60 p-5">
              <p className="text-sm font-bold text-white">Tu enlace</p>
              <p className="mt-2 break-all rounded-xl bg-black/40 px-3 py-3 text-xs text-zinc-300">{link}</p>
              <button onClick={share} className="mt-3 w-full rounded-2xl bg-white py-3 text-sm font-black text-black active:scale-95">
                {copied ? "✓ Copiado" : "📤 Compartir enlace"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-3xl font-black text-white">{info.invited}</p>
                <p className="text-xs text-zinc-400">{info.invited === 1 ? "amigo se ha unido" : "amigos se han unido"}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-3xl font-black text-emerald-300">{info.active}</p>
                <p className="text-xs text-zinc-400">{info.active === 1 ? "ya ha hecho check-in" : "ya han hecho check-in"}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
              <p className="font-bold text-white">Cómo funciona</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-zinc-400">
                <li>Tu amigo abre tu enlace y crea su cuenta.</li>
                <li>Cuando haga su <b className="text-zinc-200">primer check-in</b> en un local, tú ganas <b className="text-zinc-200">+50 XP</b> y él <b className="text-zinc-200">+25 XP</b>.</li>
                <li>Hasta 20 amigos premiados.</li>
              </ol>
              <p className="mt-3 text-[11px] text-zinc-500">El premio llega con el primer check-in, no al registrarse, para que cuente solo gente que realmente sale.</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
