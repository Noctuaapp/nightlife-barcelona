"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import NocOwl from "@/components/mascot/NocOwl"
import { supabase } from "../../lib/supabase"
import { BADGES } from "../../lib/badges"

type Recap = {
  monthLabel: string
  nights: number
  clubs: number
  hoods: number
  topHood: string | null
  topStyle: string | null
  notes: number
  plans: number
  xp: number
  badges: string[]
  archetype: { emoji: string; title: string; line: string }
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

// Etiqueta según CÓMO sales (variedad, barrios, estilos), nunca según cuánto.
function pickArchetype(r: { clubs: number; hoods: number; styles: number; notes: number; nights: number; topClubShare: number }) {
  if (r.hoods >= 3) return { emoji: "🧭", title: "Trotabarrios", line: "Este mes has salido de tu zona de confort." }
  if (r.styles >= 3) return { emoji: "🎧", title: "Oído abierto", line: "Cada noche sonaba distinto." }
  if (r.notes >= 2) return { emoji: "📣", title: "Voz de la noche", line: "Tus notas ayudan a quien viene detrás." }
  if (r.nights >= 2 && r.topClubShare >= 0.6) return { emoji: "🏠", title: "Fiel a su sitio", line: "Sabes dónde te sientes en casa." }
  if (r.clubs >= 2) return { emoji: "✨", title: "Curioso nocturno", line: "Ya vas descubriendo Barcelona." }
  return { emoji: "🌙", title: "Primeros pasos", line: "El mes que viene, más." }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ")
  let line = ""
  for (const w of words) {
    const test = line ? line + " " + w : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      line = w
      y += lineH
    } else line = test
  }
  if (line) ctx.fillText(line, x, y)
  return y
}

export default function MiMesPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading")
  const [offset, setOffset] = useState<0 | 1>(0) // 0 = este mes, 1 = mes pasado
  const [recap, setRecap] = useState<Recap | null>(null)
  const [img, setImg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const owlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      setState((s) => (s === "ready" ? s : "loading"))
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setState("login"); return }
      const uid = data.user.id

      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()) // YYYY-MM-DD
      let y = Number(today.slice(0, 4))
      let m = Number(today.slice(5, 7)) - offset
      if (m < 1) { m = 12; y -= 1 }
      const ny = m === 12 ? y + 1 : y
      const nm = m === 12 ? 1 : m + 1
      const start = `${y}-${String(m).padStart(2, "0")}-01`
      const end = `${ny}-${String(nm).padStart(2, "0")}-01`
      const startTs = new Date(start + "T00:00:00").toISOString()
      const endTs = new Date(end + "T00:00:00").toISOString()

      const [{ data: cks }, { data: plans }, { data: xps }, { data: bds }] = await Promise.all([
        supabase.from("club_checkins").select("club_id, note_created_at").eq("user_id", uid).gte("checkin_date", start).lt("checkin_date", end),
        supabase.from("attendances").select("id").eq("user_id", uid).gte("created_at", startTs).lt("created_at", endTs),
        supabase.from("xp_events").select("xp_amount").eq("user_id", uid).gte("created_at", startTs).lt("created_at", endTs),
        supabase.from("user_badges").select("badge_key").eq("user_id", uid).gte("earned_at", startTs).lt("earned_at", endTs),
      ])

      const checkins = cks || []
      const ids = Array.from(new Set(checkins.map((c: any) => c.club_id)))
      let clubRows: any[] = []
      if (ids.length) {
        const { data: cl } = await supabase.from("clubs").select("id, neighborhood, music").in("id", ids)
        clubRows = cl || []
      }
      const byId = new Map(clubRows.map((c) => [c.id, c]))
      const top = (vals: (string | null | undefined)[]) => {
        const cnt: Record<string, number> = {}
        for (const v of vals) if (v && v.trim()) cnt[v.trim()] = (cnt[v.trim()] || 0) + 1
        const e = Object.entries(cnt).sort((a, b) => b[1] - a[1])
        return e.length ? e[0][0] : null
      }
      const hoodList = checkins.map((c: any) => byId.get(c.club_id)?.neighborhood)
      const styleList = checkins.map((c: any) => byId.get(c.club_id)?.music)
      const perClub: Record<string, number> = {}
      for (const c of checkins) perClub[c.club_id] = (perClub[c.club_id] || 0) + 1
      const maxClub = Math.max(0, ...Object.values(perClub))
      const hoods = new Set(hoodList.filter(Boolean)).size
      const styles = new Set(styleList.filter((s: any) => s).map((s: string) => s.toLowerCase())).size
      const notes = checkins.filter((c: any) => c.note_created_at).length

      const r: Recap = {
        monthLabel: `${MONTHS[m - 1]} ${y}`,
        nights: checkins.length,
        clubs: ids.length,
        hoods,
        topHood: top(hoodList),
        topStyle: top(styleList),
        notes,
        plans: (plans || []).length,
        xp: (xps || []).reduce((a: number, x: any) => a + (x.xp_amount || 0), 0),
        badges: (bds || []).map((b: any) => b.badge_key).filter((k: string) => BADGES[k]),
        archetype: pickArchetype({ clubs: ids.length, hoods, styles, notes, nights: checkins.length, topClubShare: checkins.length ? maxClub / checkins.length : 0 }),
      }
      setRecap(r)
      setImg(null)
      setState("ready")
    }
    load()
  }, [offset])

  const buildImage = async (r: Recap): Promise<HTMLCanvasElement> => {
    const W = 1080, H = 1920
    const c = document.createElement("canvas")
    c.width = W; c.height = H
    const ctx = c.getContext("2d")!
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, "#2a0a4a"); g.addColorStop(0.55, "#0b0414"); g.addColorStop(1, "#3a0d3f")
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const glow = ctx.createRadialGradient(W * 0.8, H * 0.12, 10, W * 0.8, H * 0.12, 700)
    glow.addColorStop(0, "rgba(168,85,247,0.45)"); glow.addColorStop(1, "rgba(168,85,247,0)")
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

    // Búho: se toma del SVG ya pintado en la página
    try {
      const svg = owlRef.current?.querySelector("svg")
      if (svg) {
        let src = svg.outerHTML
        if (!src.includes("xmlns=")) src = src.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
        const im = new Image()
        await new Promise<void>((res, rej) => { im.onload = () => res(); im.onerror = () => rej(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src) })
        ctx.drawImage(im, 80, 120, 220, 220)
      }
    } catch {}

    ctx.textBaseline = "alphabetic"
    ctx.fillStyle = "#c4b5fd"; ctx.font = "600 44px system-ui, sans-serif"
    ctx.fillText("Tu mes en Noctua", 330, 210)
    ctx.fillStyle = "#ffffff"; ctx.font = "800 68px system-ui, sans-serif"
    ctx.fillText(r.monthLabel.charAt(0).toUpperCase() + r.monthLabel.slice(1), 330, 290)

    ctx.font = "160px system-ui, sans-serif"
    ctx.fillText(r.archetype.emoji, 80, 560)
    ctx.fillStyle = "#ffffff"; ctx.font = "900 100px system-ui, sans-serif"
    const endY = wrap(ctx, r.archetype.title, 80, 700, W - 160, 110)
    ctx.fillStyle = "#d4d4d8"; ctx.font = "500 44px system-ui, sans-serif"
    wrap(ctx, r.archetype.line, 80, endY + 80, W - 160, 58)

    const cells: [string, string][] = [
      [String(r.nights), r.nights === 1 ? "noche de check-in" : "noches de check-in"],
      [String(r.clubs), r.clubs === 1 ? "local distinto" : "locales distintos"],
      [String(r.hoods), r.hoods === 1 ? "barrio" : "barrios"],
      [`+${r.xp}`, "XP ganado"],
    ]
    cells.forEach(([big, small], i) => {
      const x = 80 + (i % 2) * 460, y = 1010 + Math.floor(i / 2) * 250
      ctx.fillStyle = "rgba(255,255,255,0.07)"
      ctx.beginPath(); ctx.roundRect(x, y, 420, 210, 36); ctx.fill()
      ctx.fillStyle = "#ffffff"; ctx.font = "900 96px system-ui, sans-serif"; ctx.fillText(big, x + 36, y + 110)
      ctx.fillStyle = "#a1a1aa"; ctx.font = "500 34px system-ui, sans-serif"; ctx.fillText(small, x + 36, y + 165)
    })

    ctx.fillStyle = "#e4e4e7"; ctx.font = "600 42px system-ui, sans-serif"
    let ty = 1560
    if (r.topHood) { ctx.fillText(`📍 Tu barrio: ${r.topHood}`, 80, ty); ty += 70 }
    if (r.topStyle) { ctx.fillText(`🎧 Tu sonido: ${r.topStyle}`.slice(0, 40), 80, ty); ty += 70 }
    if (r.badges.length) ctx.fillText(`🏅 ${r.badges.length} ${r.badges.length === 1 ? "insignia nueva" : "insignias nuevas"}`, 80, ty)

    ctx.fillStyle = "#a78bfa"; ctx.font = "700 40px system-ui, sans-serif"
    ctx.fillText("noctuaapp.com", 80, 1850)
    return c
  }

  const preview = async () => {
    if (!recap) return
    setBusy(true)
    try {
      const c = await buildImage(recap)
      setImg(c.toDataURL("image/png"))
    } catch { setMsg("No se pudo crear la imagen.") }
    setBusy(false)
  }

  const share = async () => {
    if (!recap) return
    setBusy(true); setMsg("")
    try {
      const c = await buildImage(recap)
      const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"))
      if (!blob) throw new Error("blob")
      const file = new File([blob], "mi-mes-en-noctua.png", { type: "image/png" })
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], text: "Mi mes en Noctua 🦉 noctuaapp.com" }); setBusy(false); return } catch (e: any) { if (e?.name === "AbortError") { setBusy(false); return } }
      }
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob); a.download = "mi-mes-en-noctua.png"
      document.body.appendChild(a); a.click(); a.remove()
      setMsg("Imagen guardada en tus descargas.")
    } catch { setMsg("No se pudo compartir la imagen.") }
    setBusy(false)
  }

  const empty = recap && recap.nights === 0

  return (
    <div className="flex min-h-screen flex-col bg-[#050308]">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-24">
        <div ref={owlRef} className="sr-only" aria-hidden="true"><NocOwl size={220} mood="party" /></div>

        {state === "loading" && <p className="py-24 text-center text-zinc-500">Preparando tu mes…</p>}

        {state === "login" && (
          <div className="py-20 text-center">
            <div className="mx-auto w-fit"><NocOwl size={80} mood="wink" /></div>
            <h1 className="mt-4 text-2xl font-black text-white">Tu mes en Noctua</h1>
            <p className="mt-2 text-sm text-zinc-400">Inicia sesión para ver tu resumen.</p>
            <Link href="/login" className="mt-6 inline-block rounded-2xl bg-white px-6 py-3 text-sm font-black text-black">Entrar</Link>
          </div>
        )}

        {state === "ready" && recap && (
          <div>
            <div className="mb-5 flex gap-2">
              {([0, 1] as const).map((o) => (
                <button key={o} onClick={() => setOffset(o)} className={`rounded-full px-4 py-2 text-sm font-bold ${offset === o ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>
                  {o === 0 ? "Este mes" : "Mes pasado"}
                </button>
              ))}
            </div>

            {empty ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
                <div className="mx-auto w-fit"><NocOwl size={90} mood="sleepy" /></div>
                <p className="mt-4 text-lg font-black text-white">Aún no hay nada que contar de {recap.monthLabel}</p>
                <p className="mt-1 px-6 text-sm text-zinc-400">Haz check-in en un local y tu resumen empezará a llenarse.</p>
                <Link href="/clubs" className="mt-6 inline-block rounded-2xl bg-white px-6 py-3 text-sm font-black text-black">Explorar clubs</Link>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-900/60 via-[#0b0414] to-fuchsia-950/50 p-6">
                  <div className="flex items-center gap-3">
                    <NocOwl size={56} mood="party" />
                    <div>
                      <p className="text-xs font-semibold text-purple-300">Tu mes en Noctua</p>
                      <p className="text-xl font-black capitalize text-white">{recap.monthLabel}</p>
                    </div>
                  </div>
                  <p className="mt-6 text-5xl">{recap.archetype.emoji}</p>
                  <h1 className="mt-2 text-3xl font-black text-white">{recap.archetype.title}</h1>
                  <p className="mt-1 text-sm text-zinc-300">{recap.archetype.line}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      [recap.nights, recap.nights === 1 ? "noche de check-in" : "noches de check-in"],
                      [recap.clubs, recap.clubs === 1 ? "local distinto" : "locales distintos"],
                      [recap.hoods, recap.hoods === 1 ? "barrio" : "barrios"],
                      [`+${recap.xp}`, "XP ganado"],
                    ].map(([big, small]) => (
                      <div key={String(small)} className="rounded-2xl bg-white/[0.07] p-4">
                        <p className="text-3xl font-black text-white">{big}</p>
                        <p className="text-xs text-zinc-400">{small}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-1.5 text-sm text-zinc-200">
                    {recap.topHood && <p>📍 Tu barrio: <b>{recap.topHood}</b></p>}
                    {recap.topStyle && <p>🎧 Tu sonido: <b>{recap.topStyle}</b></p>}
                    {recap.plans > 0 && <p>📅 {recap.plans} {recap.plans === 1 ? "plan marcado" : "planes marcados"}</p>}
                    {recap.notes > 0 && <p>📝 {recap.notes} {recap.notes === 1 ? "nota dejada" : "notas dejadas"}</p>}
                    {recap.badges.length > 0 && <p>🏅 {recap.badges.map((k) => BADGES[k].emoji + " " + BADGES[k].name).join(" · ")}</p>}
                  </div>
                </div>

                {img && <img src={img} alt="Tu resumen del mes" className="mx-auto mt-5 w-full max-w-xs rounded-2xl border border-white/10" />}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button onClick={preview} disabled={busy} className="rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white disabled:opacity-60">👁️ Ver imagen</button>
                  <button onClick={share} disabled={busy} className="rounded-2xl bg-purple-500 py-3 text-sm font-black text-white active:scale-95 disabled:opacity-60">{busy ? "…" : "📤 Compartir"}</button>
                </div>
                {msg && <p className="mt-2 text-center text-xs text-zinc-400">{msg}</p>}
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
