"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

const createSlug = (text: string) =>
  (text || "").toLowerCase().normalize("NFD").replace(ACCENT_PATTERN, "").replace(/\s+/g, "-")

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function addMinutes(hhmm: string, mins: number): string {
  const parts = hhmm.split(":").map((n) => parseInt(n, 10))
  const h = isNaN(parts[0]) ? 0 : parts[0]
  const m = isNaN(parts[1]) ? 0 : parts[1]
  let total = h * 60 + m + mins
  total = ((total % 1440) + 1440) % 1440
  const nh = Math.floor(total / 60).toString().padStart(2, "0")
  const nm = (total % 60).toString().padStart(2, "0")
  return `${nh}:${nm}`
}

function parseBudget(price: string | null): number {
  if (!price) return 0
  if (price.toLowerCase().includes("free") || price.toLowerCase().includes("gratis")) return 0
  const num = parseInt(price.replace(/[^0-9]/g, ""))
  return isNaN(num) ? 0 : num
}

type Prefs = {
  groupKey: string
  budgetMax: number
  vibeKey: string | null
  musicSet: Set<string>
  areaSet: Set<string>
  dresscode: string
  lgtbi: boolean
}

const VIBE_MUSIC_HINT: Record<string, string> = {
  fiesta: "Commercial",
  under: "Techno",
  glam: "Commercial",
  chill: "Cocktail Bar",
}

function scoreClub(club: any, prefs: Prefs): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (prefs.musicSet.size > 0) {
    const match = club.music && Array.from(prefs.musicSet).some((m) => club.music.toLowerCase().includes(m.toLowerCase()))
    if (match) {
      score += 30
      reasons.push("🎵 tu estilo musical")
    }
  } else {
    score += 5
  }

  if (prefs.areaSet.size > 0) {
    if (club.neighborhood && prefs.areaSet.has(club.neighborhood)) {
      score += 25
      reasons.push(`📍 en ${club.neighborhood}`)
    }
  } else {
    score += 5
  }

  const price = parseBudget(club.price)
  if (price === 0 || price <= prefs.budgetMax) {
    score += 20
    reasons.push("💶 dentro de tu presupuesto")
  } else {
    score -= 15
  }

  if (prefs.lgtbi && club.lgtbi_friendly) {
    score += 18
    reasons.push("🏳️‍🌈 ambiente inclusivo")
  }

  if (prefs.dresscode !== "Cualquiera" && club.dresscode === prefs.dresscode) {
    score += 10
    reasons.push(`👔 dresscode ${prefs.dresscode.toLowerCase()}`)
  }

  if (club.trending) {
    score += 14
    reasons.push("🔥 trending esta semana")
  }

  if (club.verified) {
    score += 8
    reasons.push("✅ verificado por Noctua")
  }

  if (!club.queue || /no queue|sin cola/i.test(club.queue)) {
    score += 6
    reasons.push("⏳ sin cola")
  }

  if (prefs.groupKey === "grande" && club.vip_tables) {
    score += 15
    reasons.push("🛋️ mesas VIP para grupos")
  }

  if (prefs.vibeKey && VIBE_MUSIC_HINT[prefs.vibeKey] && club.music && club.music.toLowerCase().includes(VIBE_MUSIC_HINT[prefs.vibeKey].toLowerCase())) {
    score += 12
    reasons.push("✨ combina con tu vibe")
  }

  return { score, reasons }
}

function scoreEvent(event: any, prefs: Prefs, todayStr: string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (event.date === todayStr) {
    score += 40
    reasons.push("🌙 es esta noche")
  }

  if (prefs.musicSet.size > 0 && event.music) {
    const match = Array.from(prefs.musicSet).some((m) => event.music.toLowerCase().includes(m.toLowerCase()))
    if (match) {
      score += 25
      reasons.push("🎵 tu estilo musical")
    }
  }

  const price = parseBudget(event.price)
  if (price === 0 || price <= prefs.budgetMax) {
    score += 15
    reasons.push("💶 dentro de tu presupuesto")
  }

  if (event.featured) {
    score += 12
    reasons.push("⭐ destacado")
  }

  return { score, reasons }
}

const GROUP_OPTIONS = [
  { key: "solo", label: "Yo solo/a", icon: "🧍", desc: "Plan en solitario" },
  { key: "pareja", label: "En pareja", icon: "💑", desc: "Los dos" },
  { key: "grupo", label: "Grupo pequeño", icon: "👯", desc: "3 a 6 personas" },
  { key: "grande", label: "Grupo grande", icon: "🎉", desc: "7 o más" },
]

const BUDGET_OPTIONS = [
  { key: "ahorro", label: "Ahorro", range: "hasta 15€", icon: "🪙", max: 15 },
  { key: "moderado", label: "Moderado", range: "15-30€", icon: "💶", max: 30 },
  { key: "premium", label: "Premium", range: "30-60€", icon: "💳", max: 60 },
  { key: "sinlimite", label: "Sin límite", range: "60€+", icon: "💎", max: 9999 },
]

const VIBE_PRESETS = [
  { key: "fiesta", emoji: "🔥", label: "Fiesta total", desc: "Comercial, energía al máximo" },
  { key: "chill", emoji: "💜", label: "Ambiente chill", desc: "Copas y buena conversación" },
  { key: "under", emoji: "🕺", label: "Techno underground", desc: "Beats sin descanso" },
  { key: "glam", emoji: "🥂", label: "Glamour VIP", desc: "Mesas, botellas, buen rollo" },
  { key: "pride", emoji: "🏳️‍🌈", label: "Ambiente LGTBI+", desc: "Espacios inclusivos y seguros", lgtbi: true },
  { key: "live", emoji: "🎷", label: "Sorpréndeme", desc: "Déjate llevar por Noctua" },
]

const MUSIC_OPTIONS = ["Techno", "Commercial", "House", "Reggaeton", "Rock", "Cocktail Bar"]
const AREA_OPTIONS = ["Eixample", "Gràcia", "Barceloneta", "Poblenou", "Raval", "El Born", "Paral·lel", "Les Corts", "Montjuïc"]
const DRESSCODE_OPTIONS = ["Cualquiera", "Casual", "Smart casual", "Elegante", "Dark casual"]

const TIME_WINDOWS: Record<string, { label: string; sub: string; emoji: string; start: string }> = {
  early: { label: "Pronto", sub: "antes de la 1", emoji: "🌙", start: "23:00" },
  peak: { label: "Punta", sub: "1 - 3 AM", emoji: "🔥", start: "00:30" },
  late: { label: "Tarde", sub: "después de las 3", emoji: "🌅", start: "02:30" },
  allnight: { label: "Toda la noche", sub: "sin prisas", emoji: "♾️", start: "23:30" },
}

const STEP_TITLES = ["Grupo", "Presupuesto", "Vibe", "Música", "Zona", "Toque final"]
const LOADING_MESSAGES = [
  "Analizando tu vibe...",
  "Explorando Barcelona...",
  "Filtrando los mejores planes...",
  "Comprobando el ambiente...",
  "Montando tu plan perfecto...",
]

type Stop = {
  id: string
  time: string
  kind: "event" | "club"
  title: string
  subtitle: string
  reasons: string[]
  image: string | null
  href: string
  mapHref: string | null
}

export default function PlanPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [clubs, setClubs] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [phase, setPhase] = useState<"form" | "loading" | "results">("form")
  const [step, setStep] = useState(0)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)

  const [groupKey, setGroupKey] = useState("pareja")
  const [budgetKey, setBudgetKey] = useState("moderado")
  const [vibeKey, setVibeKey] = useState<string | null>(null)
  const [musicSet, setMusicSet] = useState<Set<string>>(new Set())
  const [areaSet, setAreaSet] = useState<Set<string>>(new Set())
  const [dresscode, setDresscode] = useState("Cualquiera")
  const [timeKey, setTimeKey] = useState<"early" | "peak" | "late" | "allnight">("peak")
  const [lgtbi, setLgtbi] = useState(false)

  const [stops, setStops] = useState<Stop[]>([])
  const [alternatives, setAlternatives] = useState<any[]>([])
  const [otherEvents, setOtherEvents] = useState<any[]>([])
  const [noResults, setNoResults] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
    }
    checkSession()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: clubsData }, { data: eventsData }] = await Promise.all([
        supabase.from("clubs").select("*").eq("hidden", false),
        supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true }),
      ])
      if (clubsData) setClubs(clubsData)
      if (eventsData) setEvents(eventsData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const budgetMax = BUDGET_OPTIONS.find((b) => b.key === budgetKey)?.max ?? 9999
  const groupLabel = GROUP_OPTIONS.find((g) => g.key === groupKey)?.label || ""
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.key === budgetKey)?.label || ""
  const vibeLabel = VIBE_PRESETS.find((v) => v.key === vibeKey)?.label || "Sorpresa"
  const vibeEmoji = VIBE_PRESETS.find((v) => v.key === vibeKey)?.emoji || "🎲"
  const timeLabel = TIME_WINDOWS[timeKey].label

  const todayStr = new Date().toISOString().split("T")[0]
  const todayFormatted = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })

  const selectVibe = (key: string) => {
    if (vibeKey === key) {
      setVibeKey(null)
      return
    }
    setVibeKey(key)
    const preset = VIBE_PRESETS.find((v) => v.key === key)
    if (preset?.lgtbi) setLgtbi(true)
    const hint = VIBE_MUSIC_HINT[key]
    if (hint && musicSet.size === 0) setMusicSet(new Set([hint]))
  }

  const generatePlan = () => {
    setPhase("loading")
    setLoadingMsgIndex(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setLoadingMsgIndex(i % LOADING_MESSAGES.length)
    }, 450)

    setTimeout(() => {
      clearInterval(interval)
      computePlan()
      setPhase("results")
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100)
    }, 1900)
  }

  const computePlan = () => {
    const prefs: Prefs = { groupKey, budgetMax, vibeKey, musicSet, areaSet, dresscode, lgtbi }

    const scoredClubs = clubs
      .filter((c) => !c.sold_out)
      .map((c) => ({ ...c, ...scoreClub(c, prefs) }))
      .sort((a, b) => b.score - a.score)

    const scoredEvents = events
      .filter((e) => !e.sold_out)
      .map((e) => ({ ...e, ...scoreEvent(e, prefs, todayStr) }))
      .sort((a, b) => b.score - a.score)

    const tonightEvent = scoredEvents.find((e) => e.date === todayStr)
    const upcoming = scoredEvents
      .filter((e) => e.date && e.date > todayStr)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .slice(0, 6)

    const top = scoredClubs[0]
    const second = scoredClubs[1]
    const alts = scoredClubs.slice(2, 6)

    const win = TIME_WINDOWS[timeKey]
    const newStops: Stop[] = []
    let cursor = win.start

    if (tonightEvent) {
      newStops.push({
        id: `event-${tonightEvent.id}`,
        time: tonightEvent.start_time || win.start,
        kind: "event",
        title: tonightEvent.title,
        subtitle: tonightEvent.club_name || "Evento especial",
        reasons: (tonightEvent.reasons?.length ? tonightEvent.reasons : ["🌙 es esta noche"]).slice(0, 3),
        image: tonightEvent.image,
        href: `/event/${createSlug(tonightEvent.title)}`,
        mapHref: tonightEvent.latitude && tonightEvent.longitude ? `/map?type=events&id=${tonightEvent.id}` : null,
      })
      cursor = addMinutes(tonightEvent.start_time || win.start, 120)
    }

    if (top) {
      newStops.push({
        id: `club-${top.id}`,
        time: cursor,
        kind: "club",
        title: top.name,
        subtitle: top.neighborhood || "Barcelona",
        reasons: (top.reasons || []).slice(0, 3),
        image: top.image,
        href: `/clubs/${createSlug(top.name)}`,
        mapHref: top.latitude && top.longitude ? `/map?type=clubs&id=${top.id}` : null,
      })
      cursor = addMinutes(cursor, 120)
    }

    if (second) {
      newStops.push({
        id: `club-${second.id}`,
        time: cursor,
        kind: "club",
        title: second.name,
        subtitle: second.neighborhood || "Barcelona",
        reasons: (second.reasons || []).slice(0, 3),
        image: second.image,
        href: `/clubs/${createSlug(second.name)}`,
        mapHref: second.latitude && second.longitude ? `/map?type=clubs&id=${second.id}` : null,
      })
    }

    setStops(newStops)
    setAlternatives(alts)
    setOtherEvents(upcoming)
    setNoResults(newStops.length === 0)
  }

  const resetFilters = () => {
    setGroupKey("pareja")
    setBudgetKey("moderado")
    setVibeKey(null)
    setMusicSet(new Set())
    setAreaSet(new Set())
    setDresscode("Cualquiera")
    setTimeKey("peak")
    setLgtbi(false)
    setPhase("form")
    setStep(0)
  }

  const editPlan = () => {
    setPhase("form")
    setStep(0)
  }

  const Glow = () => (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
      <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-[float_18s_ease-in-out_infinite]" />
      <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-pink-500/10 blur-[130px] animate-[float_22s_ease-in-out_infinite_reverse]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  )

  if (isLoggedIn === null || loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center text-white">
        <Glow />
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Cargando...</p>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <Header />
        <main className="relative flex min-h-screen items-center justify-center px-4 text-white">
          <Glow />
          <div className="max-w-md text-center">
            <div className="mb-6 text-7xl">✨</div>
            <h1 className="text-4xl font-black text-white">Planifica tu noche</h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-400">
              Regístrate para crear tu plan perfecto en Barcelona, a tu medida y sin gastar un euro de más.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/signup" className="rounded-full bg-white px-8 py-4 font-bold text-black transition hover:scale-105">
                Crear cuenta
              </Link>
              <Link href="/login" className="rounded-full border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="relative min-h-screen pb-40 text-white">
        <Glow />

        <section className="relative px-4 pt-14 pb-8 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300">
            ✨ Noctua
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white md:text-7xl">Planifica tu noche</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-zinc-400">
            Dinos qué buscas y te montamos el plan perfecto por Barcelona, sin coste ni sorpresas.
          </p>
        </section>

        {phase === "form" && (
          <section className="mx-auto max-w-2xl px-4">
            <div className="mb-8 flex items-center gap-2">
              {STEP_TITLES.map((title, i) => (
                <div key={title} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-white/10"}`} />
                </div>
              ))}
            </div>
            <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
              Paso {step + 1} de {STEP_TITLES.length} · {STEP_TITLES[step]}
            </p>

            <div key={step} className="animate-[fadeSlide_.4s_ease] rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
              {step === 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {GROUP_OPTIONS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setGroupKey(g.key)}
                      className={`rounded-3xl border p-6 text-left transition ${
                        groupKey === g.key ? "border-purple-400/50 bg-purple-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <p className="text-3xl">{g.icon}</p>
                      <p className="mt-3 font-bold text-white">{g.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">{g.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {BUDGET_OPTIONS.map((b) => (
                    <button
                      key={b.key}
                      onClick={() => setBudgetKey(b.key)}
                      className={`rounded-3xl border p-6 text-left transition ${
                        budgetKey === b.key ? "border-pink-400/50 bg-pink-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <p className="text-3xl">{b.icon}</p>
                      <p className="mt-3 font-bold text-white">{b.label}</p>
                      <p className="mt-1 text-sm text-zinc-500">{b.range}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {VIBE_PRESETS.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => selectVibe(v.key)}
                      className={`rounded-3xl border p-5 text-left transition ${
                        vibeKey === v.key ? "border-purple-400/50 bg-purple-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <p className="text-3xl">{v.emoji}</p>
                      <p className="mt-3 font-bold text-white">{v.label}</p>
                      <p className="mt-1 text-xs text-zinc-500">{v.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="mb-4 text-sm text-zinc-400">Elige uno o varios estilos (opcional).</p>
                  <div className="flex flex-wrap gap-3">
                    {MUSIC_OPTIONS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMusicSet((s) => toggleInSet(s, m))}
                        className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                          musicSet.has(m) ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <p className="mb-4 text-sm text-zinc-400">Elige uno o varios barrios (opcional).</p>
                  <div className="flex flex-wrap gap-3">
                    {AREA_OPTIONS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setAreaSet((s) => toggleInSet(s, a))}
                        className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                          areaSet.has(a) ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        📍 {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                  <div>
                    <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">¿A qué hora sales?</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(TIME_WINDOWS).map(([key, w]) => (
                        <button
                          key={key}
                          onClick={() => setTimeKey(key as any)}
                          className={`rounded-2xl border py-4 text-center transition ${
                            timeKey === key ? "border-purple-400/50 bg-purple-500/15" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                          }`}
                        >
                          <p className="text-2xl">{w.emoji}</p>
                          <p className="mt-1 text-sm font-bold text-white">{w.label}</p>
                          <p className="text-xs text-zinc-500">{w.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">Dresscode</p>
                    <div className="flex flex-wrap gap-3">
                      {DRESSCODE_OPTIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDresscode(d)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            dresscode === d ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setLgtbi(!lgtbi)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold transition ${
                      lgtbi ? "border-pink-500/40 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    🏳️‍🌈 Priorizar ambiente LGTBI+ friendly
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10"
                >
                  Atrás
                </button>
              )}
              {step < STEP_TITLES.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="flex-1 rounded-2xl py-4 font-black text-white transition hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={generatePlan}
                  className="flex-1 rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  🌙 Generar mi plan
                </button>
              )}
            </div>
          </section>
        )}

        {phase === "loading" && (
          <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
            <div className="relative mb-8 h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-purple-400" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🌙</div>
            </div>
            <p className="text-xl font-bold text-white transition-all">{LOADING_MESSAGES[loadingMsgIndex]}</p>
          </section>
        )}

        {phase === "results" && (
          <section id="results" className="mx-auto mt-4 max-w-3xl px-4">
            {noResults ? (
              <div className="rounded-[32px] border border-white/10 bg-white/[0.03] py-20 text-center">
                <p className="text-5xl">🌚</p>
                <p className="mt-4 text-lg font-bold text-white">No hemos encontrado planes con estos filtros</p>
                <p className="mt-2 text-sm text-zinc-500">Prueba quitando algún filtro para abrir el abanico.</p>
                <button
                  onClick={resetFilters}
                  className="mt-6 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                >
                  Quitar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* PASE DE LA NOCHE */}
                <div className="overflow-hidden rounded-[32px] border border-white/10" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(236,72,153,0.12) 100%)" }}>
                  <div className="flex items-center justify-between px-8 pt-7">
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-200">Tu pase de esta noche</p>
                    <p className="text-xs font-semibold text-purple-200">Noctua ✦</p>
                  </div>
                  <div className="px-8 pb-6 pt-3">
                    <p className="text-2xl font-black capitalize text-white">{todayFormatted}</p>
                    <p className="mt-1 text-sm text-purple-200/80">Barcelona</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-dashed border-white/20 px-8 py-6 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-400">Grupo</p>
                      <p className="mt-1 font-bold text-white">{groupLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Presupuesto</p>
                      <p className="mt-1 font-bold text-white">{budgetLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Vibe</p>
                      <p className="mt-1 font-bold text-white">{vibeEmoji} {vibeLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Horario</p>
                      <p className="mt-1 font-bold text-white">{timeLabel}</p>
                    </div>
                  </div>
                  <div
                    className="h-3 w-full"
                    style={{
                      backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 2px, transparent 2px, transparent 6px)",
                    }}
                  />
                </div>

                {/* TIMELINE */}
                <div>
                  <p className="mb-6 text-xs uppercase tracking-widest text-zinc-500">Tu itinerario</p>
                  <div className="relative space-y-8 pl-2">
                    <div className="absolute bottom-4 left-[27px] top-4 w-px bg-gradient-to-b from-purple-500 via-pink-500 to-amber-400" />
                    {stops.map((stop) => (
                      <div key={stop.id} className="relative flex gap-5">
                        <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black text-xl shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                          {stop.kind === "event" ? "🎫" : "🪩"}
                        </div>
                        <Link
                          href={stop.href}
                          className="group flex flex-1 gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          {stop.image && (
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                              <img src={stop.image} alt={stop.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">🕒 {stop.time}</p>
                              {stop.mapHref && (
                                <span className="shrink-0 text-xs font-semibold text-zinc-400 group-hover:text-white">🗺️ mapa</span>
                              )}
                            </div>
                            <p className="mt-2 truncate text-lg font-black text-white">{stop.title}</p>
                            <p className="truncate text-sm text-zinc-500">{stop.subtitle}</p>
                            {stop.reasons.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {stop.reasons.map((r) => (
                                  <span key={r} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ALTERNATIVAS */}
                {alternatives.length > 0 && (
                  <div>
                    <p className="mb-5 text-xs uppercase tracking-widest text-zinc-500">Otras joyas para esta noche</p>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {alternatives.map((club) => (
                        <Link
                          key={club.id}
                          href={`/clubs/${createSlug(club.name)}`}
                          className="group w-52 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-white/20"
                        >
                          <div className="relative h-32 overflow-hidden">
                            <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                          <div className="p-3">
                            <p className="truncate font-bold text-white">{club.name}</p>
                            <p className="truncate text-xs text-zinc-500">{club.neighborhood || "Barcelona"}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROXIMOS EVENTOS */}
                {otherEvents.length > 0 && (
                  <div>
                    <p className="mb-5 text-xs uppercase tracking-widest text-zinc-500">Eventos próximos que te pueden gustar</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {otherEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={`/event/${createSlug(event.title)}`}
                          className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                            <img src={event.image || "/events/gracia.jpg"} alt={event.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">{event.title}</p>
                            <p className="text-xs text-zinc-500">
                              {event.date ? new Date(event.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "TBA"}
                              {event.price ? ` · ${event.price}` : ""}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={editPlan}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 font-bold text-white transition hover:bg-white/10"
                  >
                    Editar preferencias
                  </button>
                  <button
                    onClick={generatePlan}
                    className="flex-1 rounded-2xl py-4 font-black text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                  >
                    🔄 Rehacer plan
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <BottomNav />

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}