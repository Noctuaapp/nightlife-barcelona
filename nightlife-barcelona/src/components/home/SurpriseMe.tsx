"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import NocOwl from "../mascot/NocOwl"
import SharePlanButton from "../plan/SharePlanButton"
import NocSays from "../mascot/NocSays"
import { clubOpenNow } from "../../lib/clubHours"
import { createSlug } from "../../lib/slug"
import { zoneOf, zonesPresent } from "../../lib/zones"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"

type Mood = "any" | "dance" | "chat" | "chill" | "live"

const MOODS: { id: Mood; label: string; emoji: string; words: string[] }[] = [
  { id: "any", label: "Lo que sea", emoji: "✨", words: [] },
  { id: "dance", label: "Bailar", emoji: "💃", words: ["techno", "house", "electr", "reggaeton", "latin", "comerc", "commercial", "hip", "r&b", "dance", "disco", "trap"] },
  { id: "chat", label: "Charlar", emoji: "🗣️", words: ["lounge", "cocktail", "coctel", "pop", "indie", "rock", "bar", "chill"] },
  { id: "chill", label: "Tranquilo", emoji: "🌙", words: ["jazz", "chill", "lounge", "soul", "funk", "acoust", "acústic", "deep"] },
  { id: "live", label: "En vivo", emoji: "🎸", words: ["live", "vivo", "concert", "jazz", "rock", "indie", "flamenco", "blues"] },
]

function pickWeighted<T>(items: T[], weight: (x: T) => number): T {
  const ws = items.map((i) => Math.max(0.1, weight(i)))
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

export default function SurpriseMe({ clubs }: { clubs: any[] }) {
  const [open, setOpen] = useState(false)
  const [mood, setMood] = useState<Mood>("any")
  const [near, setNear] = useState(false)
  const [zoneSel, setZoneSel] = useState("")
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null)
  const [geoError, setGeoError] = useState("")
  const [phase, setPhase] = useState<"form" | "spin" | "result">("form")
  const [shown, setShown] = useState<any | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [note, setNote] = useState("")
  const [seen, setSeen] = useState<number[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
      if (timer.current) clearInterval(timer.current)
    }
  }, [open])

  const [locating, setLocating] = useState(false)
  const toggleNear = () => {
    if (locating) return
    if (near) { setNear(false); return }
    setGeoError("")
    if (!navigator.geolocation) { setGeoError("Este navegador no permite ubicación. Te sorprendo en toda Barcelona."); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lon: p.coords.longitude }); setNear(true); setLocating(false) },
      (err) => {
        setLocating(false)
        setGeoError(
          err.code === 1
            ? "Ubicación bloqueada. Actívala para noctuaapp.com en los ajustes del navegador (candado junto a la dirección) y vuelve a tocar."
            : "No he podido localizarte (señal o tiempo agotado). Prueba de nuevo o sorpréndete sin esto."
        )
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    )
  }

  const draw = () => {
    const zoned = zoneSel ? clubs.filter((c) => c && c.name && zoneOf(c) === zoneSel) : clubs
    const usable = (zoned.length > 0 ? zoned : clubs).filter((c) => c && c.name)
    if (usable.length === 0) return
    const words = MOODS.find((m) => m.id === mood)?.words || []
    const matches = (c: any) => words.length === 0 || words.some((w) => `${c.music || ""} ${c.category || ""}`.toLowerCase().includes(w))
    const withDist = (c: any) =>
      pos && c.latitude && c.longitude ? distanceInMeters(pos.lat, pos.lon, Number(c.latitude), Number(c.longitude)) : null
    const isNear = (c: any) => { const d = withDist(c); return !near || d === null || d <= 4000 }

    let msg = ""
    const tiers: { label: string; fn: (c: any) => boolean }[] = [
      { label: "", fn: (c) => clubOpenNow(c.hours) === true && matches(c) && isNear(c) },
      { label: "Nada abierto con ese rollo ahora mismo; te propongo otra cosa abierta.", fn: (c) => clubOpenNow(c.hours) === true && isNear(c) },
      { label: "Ahora no hay nada abierto: te dejo un plan para más tarde.", fn: (c) => matches(c) && isNear(c) },
      { label: "Ahora no hay nada abierto: te dejo un plan para más tarde.", fn: () => true },
    ]
    let pool: any[] = []
    for (const tier of tiers) {
      pool = usable.filter(tier.fn)
      const fresh = pool.filter((c) => !seen.includes(c.id))
      if (fresh.length > 0) { pool = fresh; msg = tier.label; break }
      if (pool.length > 0) { msg = tier.label; break }
    }
    if (pool.length === 0) pool = usable
    const chosen = pickWeighted(pool, (c) => 1 + (c.trending ? 1.5 : 0) + (c.verified ? 0.5 : 0) + (Number(c.rating) || 3.5) / 5)

    setNote(msg)
    setPhase("spin")
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setResult(chosen); setSeen((s) => [...s, chosen.id]); setPhase("result")
      return
    }
    let ticks = 0
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      ticks++
      setShown(usable[Math.floor(Math.random() * usable.length)])
      if (ticks >= 14) {
        if (timer.current) clearInterval(timer.current)
        setShown(chosen); setResult(chosen); setSeen((s) => [...s, chosen.id]); setPhase("result")
      }
    }, 110)
  }

  const close = () => {
    if (timer.current) clearInterval(timer.current)
    setOpen(false); setPhase("form"); setResult(null); setShown(null)
  }

  const card = phase === "result" ? result : shown
  const dist = card && pos && card.latitude && card.longitude ? distanceInMeters(pos.lat, pos.lon, Number(card.latitude), Number(card.longitude)) : null
  const isOpen = card ? clubOpenNow(card.hours) : null

  return (
    <>
      <div className="flex flex-col gap-4 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-600/20 via-black/70 to-black/80 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <NocSays />
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-2xl bg-white px-6 py-4 text-sm font-black text-black transition hover:scale-[1.03] active:scale-95"
        >
          🎲 Sorpréndeme
        </button>
      </div>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Sorpréndeme">
          <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-6 sm:rounded-3xl">
            <button onClick={close} aria-label="Cerrar" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">✕</button>

            {phase === "form" && (
              <>
                <div className="flex items-center gap-3">
                  <NocOwl size={56} mood="wink" />
                  <div>
                    <h2 className="text-xl font-black text-white">¿Qué te apetece?</h2>
                    <p className="text-sm text-zinc-400">Yo elijo, tú disfrutas.</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${mood === m.id ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
                {zonesPresent(clubs).length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {["", ...zonesPresent(clubs)].map((z) => (
                      <button
                        key={z || "all"}
                        onClick={() => setZoneSel(z)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${zoneSel === z ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                      >
                        {z === "" ? "🌍 Toda el área" : z.replace(" de Llobregat", "").replace(" de Besòs", "").replace(" de Gramenet", "")}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={toggleNear}
                  className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${near ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                >
                  📍 {locating ? "Localizando…" : near ? "Cerca de mí (activado)" : "Cerca de mí"}
                </button>
                {geoError && <p className="mt-2 text-xs text-amber-300">{geoError}</p>}
                <button onClick={draw} className="mt-5 w-full rounded-2xl bg-purple-500 px-6 py-4 text-base font-black text-white transition hover:bg-purple-400 active:scale-95">
                  🎲 ¡Sorpréndeme!
                </button>
              </>
            )}

            {phase !== "form" && card && (
              <div className="pt-6">
                <div className={`relative h-60 overflow-hidden rounded-2xl border border-white/10 ${phase === "spin" ? "opacity-70" : ""}`}>
                  <img src={card.image || FALLBACK_IMAGE} alt={card.name} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  {phase === "result" && isOpen !== null && (
                    <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold ${isOpen ? "bg-emerald-400 text-black" : "bg-white/15 text-zinc-200"}`}>
                      {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                    </span>
                  )}
                  <div className="absolute bottom-0 p-4">
                    <p className="text-xs text-zinc-300">{card.neighborhood || "Barcelona"}</p>
                    <h3 className="text-2xl font-black text-white">{card.name}</h3>
                  </div>
                </div>

                {phase === "spin" && <p className="mt-4 text-center text-sm font-bold text-zinc-400">Noc está pensando…</p>}

                {phase === "result" && (
                  <>
                    <div className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                      <NocOwl size={32} mood="party" />
                      <span>{[card.music, dist !== null ? `${formatDistance(dist)} · ${walkingMinutes(dist)} min a pie` : ""].filter(Boolean).join(" · ")}</span>
                    </div>
                    {note && <p className="mt-2 text-xs text-amber-300">{note}</p>}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link href={`/clubs/${card.slug || createSlug(card.name)}`} className="col-span-2 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-black">
                        Ver ficha
                      </Link>
                      {pos && card.latitude && card.longitude && (
                        <a href={walkingDirectionsUrl(pos.lat, pos.lon, Number(card.latitude), Number(card.longitude))} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white">
                          Cómo llegar
                        </a>
                      )}
                      <SharePlanButton
                        label="🔗 Proponer a mis amigos"
                        className="col-span-2 rounded-2xl border border-purple-400/40 bg-purple-500/10 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                        title={`Plan de la noche · ${card.name}`}
                        stops={[{ kind: "club", title: card.name, subtitle: [card.neighborhood, card.music].filter(Boolean).join(" · "), image: card.image, href: `/clubs/${card.slug || createSlug(card.name)}` }]}
                      />
                      <button onClick={draw} className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white ${pos && card.latitude ? "" : "col-span-2"}`}>
                        🎲 Otra opción
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
