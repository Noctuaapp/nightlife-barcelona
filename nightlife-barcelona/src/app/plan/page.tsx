"use client"

import SharePlanButton from "@/components/plan/SharePlanButton"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import AuthGateModal from "../../components/ui/AuthGateModal"
import { supabase } from "../../lib/supabase"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

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
  venueTypeSet: Set<string>
  dresscode: string
  lgtbi: boolean
}

const VIBE_MUSIC_HINT: Record<string, string> = {
  fiesta: "Commercial",
  under: "Techno",
  glam: "Commercial",
  chill: "Cocktail Bar",
}

function scoreClub(club: any, prefs: Prefs, t: (key: string) => string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (prefs.musicSet.size > 0) {
    const match = club.music && Array.from(prefs.musicSet).some((m) => club.music.toLowerCase().includes(m.toLowerCase()))
    if (match) {
      score += 30
      reasons.push(t("planPage.reasonMusicMatch"))
    }
  } else {
    score += 5
  }

  // Sin esto, el algoritmo no distinguía discotecas de pubs o bares musicales — el filtro de
  // música (techno, reggaeton...) sesgaba casi siempre hacia discotecas. Con una preferencia de
  // tipo de local explícita, se puede pedir de verdad "solo pubs" o "solo bares musicales".
  if (prefs.venueTypeSet.size > 0) {
    if (club.venue_type && prefs.venueTypeSet.has(club.venue_type)) {
      score += 28
      reasons.push(`🏠 ${club.venue_type.toLowerCase()}`)
    } else if (club.venue_type) {
      score -= 20
    }
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
    reasons.push(t("planPage.reasonBudget"))
  } else {
    score -= 15
  }

  if (prefs.lgtbi && club.lgtbi_friendly) {
    score += 18
    reasons.push(t("planPage.reasonLgtbi"))
  }

  if (prefs.dresscode !== "Cualquiera" && club.dresscode === prefs.dresscode) {
    score += 10
    reasons.push(`👔 dresscode ${prefs.dresscode.toLowerCase()}`)
  }

  if (club.trending) {
    score += 14
    reasons.push(t("planPage.reasonTrending"))
  }

  if (club.verified) {
    score += 8
    reasons.push(t("planPage.reasonVerified"))
  }

  if (!club.queue || /no queue|sin cola/i.test(club.queue)) {
    score += 6
    reasons.push(t("planPage.reasonNoQueue"))
  }

  if (prefs.groupKey === "grande" && club.vip_tables) {
    score += 15
    reasons.push(t("planPage.reasonVipGroups"))
  }

  if (prefs.vibeKey && VIBE_MUSIC_HINT[prefs.vibeKey] && club.music && club.music.toLowerCase().includes(VIBE_MUSIC_HINT[prefs.vibeKey].toLowerCase())) {
    score += 12
    reasons.push(t("planPage.reasonMatchesVibe"))
  }

  return { score, reasons }
}

function scoreEvent(event: any, prefs: Prefs, todayStr: string, t: (key: string) => string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (event.date === todayStr) {
    score += 40
    reasons.push(t("planPage.reasonTonight"))
  }

  if (prefs.musicSet.size > 0 && event.music) {
    const match = Array.from(prefs.musicSet).some((m) => event.music.toLowerCase().includes(m.toLowerCase()))
    if (match) {
      score += 25
      reasons.push(t("planPage.reasonMusicMatch"))
    }
  }

  const price = parseBudget(event.price)
  if (price === 0 || price <= prefs.budgetMax) {
    score += 15
    reasons.push(t("planPage.reasonBudget"))
  }

  if (event.featured) {
    score += 12
    reasons.push(t("planPage.reasonFeatured"))
  }

  return { score, reasons }
}

const GROUP_OPTIONS = [
  { key: "solo", label: "Yo solo/a", icon: "🧍", desc: "Plan en solitario" },
  { key: "pareja", label: "2 personas", icon: "👥", desc: "Los dos" },
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

const VENUE_TYPE_OPTIONS = ["Discoteca", "Pub", "Bar musical"]
const MUSIC_OPTIONS = ["Techno", "Commercial", "House", "Reggaeton", "Rock", "Cocktail Bar"]
const AREA_OPTIONS = ["Eixample", "Gràcia", "Barceloneta", "Poblenou", "Raval", "El Born", "Paral·lel", "Les Corts", "Montjuïc"]
const DRESSCODE_OPTIONS = ["Cualquiera", "Casual", "Smart casual", "Elegante", "Dark casual"]

const TIME_WINDOWS: Record<string, { label: string; sub: string; emoji: string; start: string }> = {
  early: { label: "Pronto", sub: "antes de la 1", emoji: "🌙", start: "23:00" },
  peak: { label: "Punta", sub: "1 - 3 AM", emoji: "🔥", start: "00:30" },
  late: { label: "Tarde", sub: "después de las 3", emoji: "🌅", start: "02:30" },
  allnight: { label: "Toda la noche", sub: "sin prisas", emoji: "♾️", start: "23:30" },
}

// Los títulos de paso y los mensajes de carga se generan dentro del componente
// (STEP_TITLES_T / LOADING_MESSAGES_T) para poder traducirlos con t().

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
  const { t, locale } = useLanguage()
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
  const [venueTypeSet, setVenueTypeSet] = useState<Set<string>>(new Set())
  const [musicSet, setMusicSet] = useState<Set<string>>(new Set())
  const [areaSet, setAreaSet] = useState<Set<string>>(new Set())
  const [dresscode, setDresscode] = useState("Cualquiera")
  const [timeKey, setTimeKey] = useState<"early" | "peak" | "late" | "allnight">("peak")
  const [lgtbi, setLgtbi] = useState(false)

  const [stops, setStops] = useState<Stop[]>([])
  const [alternatives, setAlternatives] = useState<any[]>([])
  const [otherEvents, setOtherEvents] = useState<any[]>([])
  const [noResults, setNoResults] = useState(false)
  // Clubs ya mostrados en planes anteriores de esta sesión (se resetea al editar preferencias
  // o al volver a empezar). "Rehacer plan" los excluye para no devolver siempre lo mismo.
  const [seenClubIds, setSeenClubIds] = useState<Set<string>>(new Set())

  const [userId, setUserId] = useState<string | null>(null)
  const [autoDetectedNote, setAutoDetectedNote] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
      setUserId(data.session?.user.id || null)
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

  // Si el usuario está logueado, miramos sus favoritos y últimas visitas (clubs) para
  // pre-rellenar sus preferencias en el formulario — sin obligarle, solo como punto de partida
  // que puede cambiar libremente. Solo se aplica una vez y solo si no ha tocado nada todavía.
  useEffect(() => {
    if (!userId || clubs.length === 0) return
    if (musicSet.size > 0 || venueTypeSet.size > 0 || areaSet.size > 0) return

    const detectPreferences = async () => {
      const [{ data: favData }, { data: visitData }] = await Promise.all([
        supabase.from("favorites").select("item_id").eq("user_id", userId).eq("item_type", "club"),
        supabase.from("analytics").select("item_id").eq("user_id", userId).eq("item_type", "club").eq("event_type", "page_view").limit(30),
      ])

      const clubIds = new Set<string>([
        ...(favData || []).map((f: any) => String(f.item_id)),
        ...(visitData || []).map((v: any) => String(v.item_id)),
      ])
      if (clubIds.size === 0) return

      const history = clubs.filter((c) => clubIds.has(String(c.id)))
      if (history.length === 0) return

      const tally = (options: string[], getValue: (c: any) => string | null) => {
        const counts: Record<string, number> = {}
        history.forEach((c) => {
          const value = getValue(c)
          if (!value) return
          options.forEach((opt) => {
            if (value.toLowerCase().includes(opt.toLowerCase())) counts[opt] = (counts[opt] || 0) + 1
          })
        })
        return Object.entries(counts)
          .filter(([, n]) => n >= 2)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => k)
          .slice(0, 2)
      }

      const topMusic = tally(MUSIC_OPTIONS, (c) => c.music)
      const topVenue = tally(VENUE_TYPE_OPTIONS, (c) => c.venue_type)
      const topArea = tally(AREA_OPTIONS, (c) => c.neighborhood)

      if (topMusic.length === 0 && topVenue.length === 0 && topArea.length === 0) return

      if (topMusic.length > 0) setMusicSet(new Set(topMusic))
      if (topVenue.length > 0) setVenueTypeSet(new Set(topVenue))
      if (topArea.length > 0) setAreaSet(new Set(topArea))
      setAutoDetectedNote(t("planPage.autoDetectedNote"))
    }
    detectPreferences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, clubs])

  const budgetMax = BUDGET_OPTIONS.find((b) => b.key === budgetKey)?.max ?? 9999
  const groupLabel = GROUP_OPTIONS.find((g) => g.key === groupKey)?.label || ""
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.key === budgetKey)?.label || ""
  const vibeLabel = VIBE_PRESETS.find((v) => v.key === vibeKey)?.label || t("planPage.surprise")
  const vibeEmoji = VIBE_PRESETS.find((v) => v.key === vibeKey)?.emoji || "🎲"
  const timeLabel = TIME_WINDOWS[timeKey].label

  const todayStr = new Date().toISOString().split("T")[0]
  const todayFormatted = new Date().toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long" })

  const STEP_TITLES_T = [
    t("planPage.stepGroup"), t("planPage.stepBudget"), t("planPage.stepVibe"),
    t("planPage.stepVenueType"), t("planPage.stepMusic"), t("planPage.stepArea"), t("planPage.stepFinal"),
  ]
  const LOADING_MESSAGES_T = [
    t("planPage.loading1"), t("planPage.loading2"), t("planPage.loading3"), t("planPage.loading4"), t("planPage.loading5"),
  ]

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

  // Analítica de "Planifica tu noche": registra qué combinación de filtros eligió la persona
  // cada vez que genera un plan, para poder ver en el admin qué filtros/búsquedas usa más la
  // gente. Una sola fila por generación (no una por cada toggle) para no llenar la tabla.
  const trackPlanFilters = async () => {
    const parts: string[] = []
    if (venueTypeSet.size > 0) parts.push(`tipo:${Array.from(venueTypeSet).join("/")}`)
    if (musicSet.size > 0) parts.push(`musica:${Array.from(musicSet).join("/")}`)
    if (areaSet.size > 0) parts.push(`zona:${Array.from(areaSet).join("/")}`)
    if (dresscode && dresscode !== "Cualquiera") parts.push(`dresscode:${dresscode}`)
    if (parts.length === 0) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from("analytics").insert({
      event_type: "filter_used",
      item_type: "plan",
      item_name: parts.join(" | "),
      user_id: userData.user?.id || null,
    })
  }

  const generatePlan = () => {
    trackPlanFilters()
    setPhase("loading")
    setLoadingMsgIndex(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setLoadingMsgIndex(i % LOADING_MESSAGES_T.length)
    }, 450)

    setTimeout(() => {
      clearInterval(interval)
      computePlan()
      setPhase("results")
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100)
    }, 1900)
  }

  const computePlan = () => {
    const prefs: Prefs = { groupKey, budgetMax, vibeKey, musicSet, areaSet, venueTypeSet, dresscode, lgtbi }

    // Pequeño factor aleatorio sobre el score: sin esto, "Rehacer plan" con las mismas
    // preferencias siempre calculaba exactamente los mismos clubs (el orden era 100%
    // determinista). Con este jitter, los clubs con puntuación parecida pueden intercambiar
    // el orden entre una generación y otra, dando variedad real al pulsar "Rehacer plan".
    const jitter = () => Math.random() * 8

    // Día de la semana de hoy, en el mismo formato que se guarda en "open_days" desde el admin
    // (Lun..Dom). Si un club no tiene open_days puesto (todavía sin ese dato), no lo excluimos —
    // solo filtramos los que SÍ tienen el dato y hoy no abren, para no proponer un plan a un
    // club cerrado.
    const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    const todayDay = DAY_ABBR[new Date().getDay()]

    const allScoredClubs = clubs
      .filter((c) => !c.sold_out)
      .filter((c) => !c.open_days || c.open_days.length === 0 || c.open_days.includes(todayDay))
      .map((c) => ({ ...c, ...scoreClub(c, prefs, t) }))
      .map((c) => ({ ...c, sortScore: c.score + jitter() }))
      .sort((a, b) => b.sortScore - a.sortScore)

    // Además del jitter, en un "Rehacer plan" evitamos repetir los clubs que ya salieron como
    // pick principal/segundo en un intento anterior de esta misma sesión, mientras haya
    // suficientes alternativas — así no vuelve a proponer literalmente lo mismo.
    const freshClubs = allScoredClubs.filter((c) => !seenClubIds.has(String(c.id)))
    const scoredClubs = freshClubs.length >= 2 ? freshClubs : allScoredClubs

    const scoredEvents = events
      .filter((e) => !e.sold_out)
      .map((e) => ({ ...e, ...scoreEvent(e, prefs, todayStr, t) }))
      .sort((a, b) => b.score - a.score)

    const tonightEvent = scoredEvents.find((e) => e.date === todayStr)
    const upcoming = scoredEvents
      .filter((e) => e.date && e.date > todayStr)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .slice(0, 6)

    const top = scoredClubs[0]
    const second = scoredClubs[1]

    // Alternativas: priorizamos clubs con el MISMO dresscode y/o barrio que el pick principal
    // (para que sean de verdad "alternativas cercanas y del mismo rollo"), y solo si no hay
    // suficientes rellenamos con los siguientes mejor puntuados.
    const restScored = allScoredClubs.filter((c) => c.id !== top?.id && c.id !== second?.id)
    const closeMatches = top
      ? restScored.filter((c) => c.neighborhood === top.neighborhood || (top.dresscode && c.dresscode === top.dresscode))
      : []
    const filler = restScored.filter((c) => !closeMatches.includes(c))
    const alts = [...closeMatches, ...filler].slice(0, 4)

    if (top || second) {
      setSeenClubIds((prev) => {
        const next = new Set(prev)
        if (top) next.add(String(top.id))
        if (second) next.add(String(second.id))
        return next
      })
    }

    const win = TIME_WINDOWS[timeKey]
    const newStops: Stop[] = []
    let cursor = win.start

    if (tonightEvent) {
      newStops.push({
        id: `event-${tonightEvent.id}`,
        time: tonightEvent.start_time || win.start,
        kind: "event",
        title: tonightEvent.title,
        subtitle: tonightEvent.club_name || t("planPage.specialEvent"),
        reasons: (tonightEvent.reasons?.length ? tonightEvent.reasons : [t("planPage.reasonTonight")]).slice(0, 3),
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
    setVenueTypeSet(new Set())
    setMusicSet(new Set())
    setAreaSet(new Set())
    setDresscode("Cualquiera")
    setTimeKey("peak")
    setLgtbi(false)
    setPhase("form")
    setStep(0)
    setSeenClubIds(new Set())
  }

  const editPlan = () => {
    setPhase("form")
    setStep(0)
    setSeenClubIds(new Set())
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
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("common.loading")}</p>
      </main>
    )
  }

  if (!isLoggedIn) {
    // En vez del cartel de "regístrate o inicia sesión" fijo, se muestra un adelanto borroso
    // de la propia pantalla de plan con el modal reutilizable de registro encima — mismo look
    // que el resto de la app (favoritos, locales cercanos). Como esta pantalla no tiene nada
    // que ofrecer sin cuenta, "Ahora no" en el modal lleva a inicio en vez de quedarse aquí.
    return (
      <>
        <Header />
        <main className="relative flex min-h-screen items-center justify-center px-4 text-white">
          <Glow />
          <div className="max-w-md select-none text-center opacity-30 blur-sm">
            <div className="mb-6 text-7xl">✨</div>
            <h1 className="text-4xl font-black text-white">{t("nav.plan")}</h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-400">
              {t("planPage.notLoggedInSubtitle")}
            </p>
          </div>
        </main>
        <BottomNav />
        <AuthGateModal
          open
          onClose={() => {
            window.location.href = "/"
          }}
          subtitleKey="authGate.subtitlePlan"
        />
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
          <h1 className="text-5xl font-black tracking-tight text-white md:text-7xl">{t("nav.plan")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-zinc-400">
            {t("planPage.subtitle")}
          </p>
        </section>

        {phase === "form" && (
          <section className="mx-auto max-w-2xl px-4">
            <div className="mb-8 flex items-center gap-2">
              {STEP_TITLES_T.map((title, i) => (
                <div key={title} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-white/10"}`} />
                </div>
              ))}
            </div>
            <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
              {t("planPage.step")} {step + 1} {t("planPage.of")} {STEP_TITLES_T.length} · {STEP_TITLES_T[step]}
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
                  <p className="mb-4 text-sm text-zinc-400">
                    {t("planPage.venueTypeInstruction")}
                  </p>
                  {autoDetectedNote && (
                    <p className="mb-4 text-xs text-purple-300">{autoDetectedNote}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {VENUE_TYPE_OPTIONS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setVenueTypeSet((s) => toggleInSet(s, v))}
                        className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                          venueTypeSet.has(v) ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <p className="mb-4 text-sm text-zinc-400">{t("planPage.musicInstruction")}</p>
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

              {step === 5 && (
                <div>
                  <p className="mb-4 text-sm text-zinc-400">{t("planPage.areaInstruction")}</p>
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

              {step === 6 && (
                <div className="space-y-8">
                  <div>
                    <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">{t("planPage.departureTimeQuestion")}</p>
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
                    🏳️‍🌈 {t("planPage.lgtbiPriority")}
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
                  {t("common.back")}
                </button>
              )}
              {step < STEP_TITLES_T.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="flex-1 rounded-2xl py-4 font-black text-white transition hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  {t("planPage.next")}
                </button>
              ) : (
                <button
                  onClick={generatePlan}
                  className="flex-1 rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  {t("planPage.generatePlanCta")}
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
            <p className="text-xl font-bold text-white transition-all">{LOADING_MESSAGES_T[loadingMsgIndex]}</p>
          </section>
        )}

        {phase === "results" && (
          <section id="results" className="mx-auto mt-4 max-w-3xl px-4">
            {noResults ? (
              <div className="rounded-[32px] border border-white/10 bg-white/[0.03] py-20 text-center">
                <p className="text-5xl">🌚</p>
                <p className="mt-4 text-lg font-bold text-white">{t("planPage.noResultsTitle")}</p>
                <p className="mt-2 text-sm text-zinc-500">{t("planPage.noResultsSubtitle")}</p>
                <button
                  onClick={resetFilters}
                  className="mt-6 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                >
                  {t("planPage.removeFilters")}
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* PASE DE LA NOCHE */}
                <div className="overflow-hidden rounded-[32px] border border-white/10" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(236,72,153,0.12) 100%)" }}>
                  <div className="flex items-center justify-between px-8 pt-7">
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-200">{t("planPage.yourPassTonight")}</p>
                    <p className="text-xs font-semibold text-purple-200">Noctua ✦</p>
                  </div>
                  <div className="px-8 pb-6 pt-3">
                    <p className="text-2xl font-black capitalize text-white">{todayFormatted}</p>
                    <p className="mt-1 text-sm text-purple-200/80">Barcelona</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-dashed border-white/20 px-8 py-6 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-400">{t("planPage.stepGroup")}</p>
                      <p className="mt-1 font-bold text-white">{groupLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">{t("planPage.stepBudget")}</p>
                      <p className="mt-1 font-bold text-white">{budgetLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">{t("planPage.stepVibe")}</p>
                      <p className="mt-1 font-bold text-white">{vibeEmoji} {vibeLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">{t("event.schedule")}</p>
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
                  <p className="mb-6 text-xs uppercase tracking-widest text-zinc-500">{t("planPage.yourItinerary")}</p>
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
                                <span className="shrink-0 text-xs font-semibold text-zinc-400 group-hover:text-white">🗺️ {t("nav.map").toLowerCase()}</span>
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
                    <p className="mb-5 text-xs uppercase tracking-widest text-zinc-500">{t("planPage.otherGems")}</p>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {alternatives.map((club) => (
                        <Link
                          key={club.id}
                          href={`/clubs/${createSlug(club.name)}`}
                          className="group w-52 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-white/20"
                        >
                          <div className="relative h-32 overflow-hidden">
                            <img src={club.image || FALLBACK_IMAGE} alt={club.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
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
                    <p className="mb-5 text-xs uppercase tracking-widest text-zinc-500">{t("planPage.upcomingEventsForYou")}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {otherEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={`/event/${createSlug(event.title)}`}
                          className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                            {/* Antes caía en "/events/gracia.jpg" (2,85MB sin comprimir) cuando el evento no
                                tenía foto propia. Usamos el mismo FALLBACK_IMAGE (SVG en línea, 0 bytes de red)
                                que ya se usa un poco más arriba para los clubs sin foto. */}
                            <img src={event.image || FALLBACK_IMAGE} alt={event.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">{event.title}</p>
                            <p className="text-xs text-zinc-500">
                              {event.date ? new Date(event.date).toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" }) : t("clubEvent.tba")}
                              {event.price ? ` · ${event.price}` : ""}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <SharePlanButton
                  title={`Plan de la noche · ${todayFormatted}`}
                  stops={stops.map((st) => ({ kind: st.kind, title: st.title, subtitle: st.subtitle, time: st.time, image: st.image, href: st.href }))}
                />

                <div className="flex gap-3">
                  <button
                    onClick={editPlan}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 font-bold text-white transition hover:bg-white/10"
                  >
                    {t("planPage.editPreferences")}
                  </button>
                  <button
                    onClick={generatePlan}
                    className="flex-1 rounded-2xl py-4 font-black text-white transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                  >
                    {t("planPage.redoPlan")}
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