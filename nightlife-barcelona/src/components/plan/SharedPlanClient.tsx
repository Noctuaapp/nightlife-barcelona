"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import NocOwl from "../mascot/NocOwl"

type Stop = { kind?: string; title?: string; subtitle?: string; time?: string; image?: string | null; href?: string }
type Plan = { title: string; plan_date: string | null; stops: Stop[]; rsvps: string[] }

const NAME_KEY = "noctua_rsvp_name"

export default function SharedPlanClient({ code }: { code: string }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading")
  const [name, setName] = useState("")
  const [joined, setJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)

  const load = async () => {
    const { data, error } = await supabase.rpc("get_night_plan", { p_code: code })
    if (error || !data) { setState("missing"); return }
    setPlan(data as Plan)
    setState("ok")
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY)
      if (saved) setName(saved)
      if (localStorage.getItem(`noctua_rsvp_${code}`)) setJoined(true)
    } catch {}
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const join = async () => {
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    setMsg("")
    const { data, error } = await supabase.rpc("rsvp_night_plan", { p_code: code, p_name: clean })
    setBusy(false)
    if (error || !data) { setMsg("No he podido apuntarte. Prueba otra vez."); return }
    try {
      localStorage.setItem(NAME_KEY, clean)
      localStorage.setItem(`noctua_rsvp_${code}`, "1")
    } catch {}
    setJoined(true)
    load()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  if (state === "loading") return <p className="py-24 text-center text-zinc-500">Cargando plan…</p>

  if (state === "missing" || !plan) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto w-fit"><NocOwl size={80} mood="sleepy" /></div>
        <h1 className="mt-4 text-2xl font-black text-white">Este plan ya no existe</h1>
        <p className="mt-2 text-sm text-zinc-400">Puede que el enlace esté mal copiado. Monta uno nuevo en un minuto.</p>
        <Link href="/plan" className="mt-6 inline-block rounded-2xl bg-white px-6 py-3 text-sm font-black text-black">Crear mi plan</Link>
      </div>
    )
  }

  const dateText = plan.plan_date
    ? new Date(plan.plan_date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
    : ""
  const goers = plan.rsvps || []

  return (
    <div>
      <div className="flex items-center gap-3">
        <NocOwl size={64} mood="party" />
        <div>
          <p className="text-xs font-semibold text-purple-300">Te han invitado a un plan</p>
          <h1 className="text-2xl font-black leading-tight text-white">{plan.title}</h1>
          {dateText && <p className="text-sm capitalize text-zinc-400">{dateText}</p>}
        </div>
      </div>

      <div className="relative mt-8 space-y-5">
        <div className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-purple-500 via-pink-500 to-amber-400" />
        {(plan.stops || []).map((s, i) => {
          const href = s.href && s.href.startsWith("/") && !s.href.startsWith("//") ? s.href : null
          const img = s.image && s.image.startsWith("https://") ? s.image : null
          const inner = (
            <div className="flex flex-1 gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              {img && <img src={img} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
              <div className="min-w-0">
                {s.time && <p className="text-xs font-bold text-purple-300">🕒 {s.time}</p>}
                <p className="truncate font-black text-white">{s.title}</p>
                {s.subtitle && <p className="truncate text-xs text-zinc-500">{s.subtitle}</p>}
              </div>
            </div>
          )
          return (
            <div key={i} className="relative flex gap-4">
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black text-base">
                {s.kind === "event" ? "🎫" : "🪩"}
              </div>
              {href ? <Link href={href} className="flex flex-1 transition hover:opacity-90">{inner}</Link> : inner}
            </div>
          )
        })}
      </div>

      <div className="mt-10 rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-600/15 to-black/60 p-5">
        {joined ? (
          <p className="text-center text-sm font-bold text-emerald-300">✓ Estás apuntado. ¡Nos vemos allí!</p>
        ) : (
          <>
            <p className="text-sm font-bold text-white">¿Te apuntas?</p>
            <p className="mt-1 text-xs text-zinc-400">No hace falta cuenta. Solo tu nombre para que los demás sepan quién viene.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                placeholder="Tu nombre"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-purple-400/60"
              />
              <button onClick={join} disabled={busy || !name.trim()} className="shrink-0 rounded-xl bg-purple-500 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-400 active:scale-95 disabled:opacity-50">
                {busy ? "…" : "🙋 Me apunto"}
              </button>
            </div>
            {msg && <p className="mt-2 text-xs text-red-400">{msg}</p>}
          </>
        )}
        <p className="mt-4 text-center text-xs text-zinc-400">
          {goers.length === 0
            ? "Todavía no se ha apuntado nadie. Sé el primero."
            : `Van: ${goers.slice(0, 8).join(", ")}${goers.length > 8 ? ` y ${goers.length - 8} más` : ""}`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={copy} className="rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white">
          {copied ? "✓ Copiado" : "🔗 Copiar enlace"}
        </button>
        <Link href="/plan" className="rounded-2xl bg-white py-3 text-center text-sm font-black text-black">
          Crear mi plan
        </Link>
      </div>
    </div>
  )
}
