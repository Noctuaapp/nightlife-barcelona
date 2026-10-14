"use client"

import SharePlanButton from "@/components/plan/SharePlanButton"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  User, Users, UsersRound, PartyPopper, Coins, Wallet, CreditCard, Gem, Flame, Wine, AudioWaveform, Sparkles, Rainbow, Shuffle,
  Moon, Sunrise, Infinity as InfinityIcon, Clock, Ticket, Disc3, Map as MapIcon, type LucideIcon,
} from "lucide-react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import LoginWall from "../../components/ui/LoginWall"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { createSlug } from "../../lib/slug"
import { zoneOf, zonesPresent } from "../../lib/zones"
import { STYLES, neighborhoodsOf } from "../../lib/areas"
import { clubOpensOn } from "../../lib/clubHours"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

// "Planifica tu noche". Cambios de la auditoría de octubre 2026:
// - Los estilos de música eran "Commercial" y "Cocktail Bar" (en inglés) contra datos en español:
//   casi nunca coincidían. Ahora son los mismos estilos que /musica (src/lib/areas.ts).
// - Los barrios eran una lista fija ("Raval", "Paral·lel", "Montjuïc") que no coincidía con los
//   barrios guardados ("El Raval"…): ahora salen de los datos.
// - El precio "15–20 €" se leía como 1520 € (se juntaban todas las cifras) y el club quedaba
//   fuera de cualquier presupuesto. Ahora se toma la primera cifra.
// - Los días de apertura se comprueban con la misma lógica que "Abierto ahora" (clubHours).
// - Emojis sustituidos por iconos; todos los textos traducidos.

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
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`
}

function parseBudget(price: string | null): number {
  if (!price) return 0
  if (/free|gratis|gratu/i.test(price)) return 0
  const first = price.match(/\d+/)
  return first ? parseInt(first[0], 10) : 0
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

type Prefs = {
  groupKey: string
  budgetMax: number
  vibeKey: string | null
  musicSet: Set<string>
  areaSet: Set<string>
  venueTypeSet: Set<string>
  dresscode: string
  lgtbi: boolean
  mature: boolean
}

const styleMatches = (music: string | null | undefined, slug: string) => {
  const style = STYLES.find((s) => s.slug === slug)
  return !!style && typeof music === "string" && style.rx.test(music)
}

// Estilo que se preselecciona al elegir un ambiente.
const VIBE_MUSIC_HINT: Record<string, string> = { fiesta: "comercial", under: "techno", glam: "comercial" }

function scoreClub(club: any, prefs: Prefs, t: (key: string) => string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (prefs.musicSet.size > 0) {
    if (Array.from(prefs.musicSet).some((m) => styleMatches(club.music, m))) {
      score += 30
      reasons.push(t("planPage.reasonMusicMatch"))
    }
  } else score += 5

  // Tipo de local: sin esto el algoritmo casi siempre proponía discotecas.
  if (prefs.venueTypeSet.size > 0) {
    if (club.venue_type && prefs.venueTypeSet.has(club.venue_type)) {
      score += 28
      reasons.push(t("planPage.reasonVenueType"))
    } else if (club.venue_type) score -= 20
  }

  if (prefs.areaSet.size > 0) {
    if (club.neighborhood && prefs.areaSet.has(club.neighborhood)) {
      score += 25
      reasons.push(t("planPage.reasonArea").replace("{name}", club.neighborhood))
    }
  } else score += 5

  const price = parseBudget(club.price)
  if (price === 0 || price <= prefs.budgetMax) {
    score += 20
    reasons.push(t("planPage.reasonBudget"))
  } else score -= 15

  // Público +30: sube los locales pensados para gente mayor y penaliza los de público joven.
  if (prefs.mature) {
    if (club.audience === "+30" || club.audience === "+40") {
      score += 25
      reasons.push(t("planPage.reasonMature"))
    } else if (club.audience === "joven") score -= 15
  }

  if (prefs.lgtbi && club.lgtbi_friendly) {
    score += 18
    reasons.push(t("planPage.reasonLgtbi"))
  }

  if (prefs.dresscode !== "any" && club.dresscode === prefs.dresscode) {
    score += 10
    reasons.push(t("planPage.reasonDresscode"))
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

  if (prefs.vibeKey && VIBE_MUSIC_HINT[prefs.vibeKey] && styleMatches(club.music, VIBE_MUSIC_HINT[prefs.vibeKey])) {
    score += 12
    reasons.push(t("planPage.reasonMatchesVibe"))
  }

  return { score, reasons }
}

// El evento ocurre en esa fecha (un día suelto, o dentro de su rango si dura varios días).
function eventOnDate(event: any, dateStr: string): boolean {
  if (!event.date) return false
  if (event.date === dateStr) return true
  return !!event.date_end && event.date <= dateStr && dateStr <= event.date_end
}

// "Esta noche" cuenta hasta las 6:00 (a las 2 de la madrugada sigues en la noche de ayer), en hora de Madrid.
function planDateFor(offset: number): Date {
  const madrid = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }))
  if (madrid.getHours() < 6) madrid.setDate(madrid.getDate() - 1)
  madrid.setHours(12, 0, 0, 0)
  madrid.setDate(madrid.getDate() + offset)
  return madrid
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function scoreEvent(event: any, prefs: Prefs, todayStr: string, t: (key: string) => string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  if (eventOnDate(event, todayStr)) {
    score += 40
    reasons.push(t("planPage.reasonTonight"))
  }
  if (prefs.musicSet.size > 0 && Array.from(prefs.musicSet).some((m) => styleMatches(event.music, m))) {
    score += 25
    reasons.push(t("planPage.reasonMusicMatch"))
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

const GROUP_OPTIONS: { key: string; icon: LucideIcon }[] = [
  { key: "solo", icon: User },
  { key: "pareja", icon: Users },
  { key: "grupo", icon: UsersRound },
  { key: "grande", icon: PartyPopper },
]

const BUDGET_OPTIONS: { key: string; icon: LucideIcon; max: number; range: string }[] = [
  { key: "ahorro", icon: Coins, max: 15, range: "≤ 15 €" },
  { key: "moderado", icon: Wallet, max: 30, range: "15–30 €" },
  { key: "premium", icon: CreditCard, max: 60, range: "30–60 €" },
  { key: "sinlimite", icon: Gem, max: 9999, range: "60 €+" },
]

const VIBE_PRESETS: { key: string; icon: LucideIcon; lgtbi?: boolean }[] = [
  { key: "fiesta", icon: Flame },
  { key: "chill", icon: Wine },
  { key: "under", icon: AudioWaveform },
  { key: "glam", icon: Sparkles },
  { key: "pride", icon: Rainbow, lgtbi: true },
  { key: "live", icon: Shuffle },
]

// Valores tal cual se guardan en la base de datos (venue_type, dresscode); las etiquetas se traducen.
const VENUE_TYPE_OPTIONS = [
  { value: "Discoteca", key: "venueClub" },
  { value: "Pub", key: "venuePub" },
  { value: "Bar musical", key: "venueMusicBar" },
]
const MUSIC_OPTIONS = STYLES.filter((s) => s.slug !== "electronica").map((s) => s.slug)
const DRESSCODE_OPTIONS = ["any", "Casual", "Smart casual", "Elegante", "Dark casual"]

const TIME_WINDOWS: Record<string, { icon: LucideIcon; start: string }> = {
  early: { icon: Moon, start: "23:00" },
  peak: { icon: Flame, start: "00:30" },
  late: { icon: Sunrise, start: "02:30" },
  allnight: { icon: InfinityIcon, start: "23:30" },
}

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
  const [zoneSel, setZoneSel] = useState("")
  const [dresscode, setDresscode] = useState("any")
  const [timeKey, setTimeKey] = useState<"early" | "peak" | "late" | "allnight">("peak")
  const [dayOffset, setDayOffset] = useState(0)
  const [lgtbi, setLgtbi] = useState(false)
  const [mature, setMature] = useState(false)

  const [stops, setStops] = useState<Stop[]>([])
  const [alternatives, setAlternatives] = useState<any[]>([])
  const [otherEvents, setOtherEvents] = useState<any[]>([])
  const [noResults, setNoResults] = useState(false)
  // Clubs ya mostrados en esta sesión: "Rehacer plan" los evita para no devolver siempre lo mismo.
  const [seenClubIds, setSeenClubIds] = useState<Set<string>>(new Set())

  const [userId, setUserId] = useState<string | null>(null)
  // null = aún comprobando la sesión. Planifica tu noche es solo para usuarios registrados.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id || null)
      setIsLoggedIn(!!data.session)
    })
    Promise.all([
      supabase.from("clubs").select("*").eq("hidden", false),
      supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true }),
    ]).then(([{ data: clubsData }, { data: eventsData }]) => {
      if (clubsData) setClubs(clubsData)
      if (eventsData) setEvents(eventsData)
      setLoading(false)
    })
  }, [])

  // Barrios con más locales (de los datos reales, no de una lista fija).
  const areaOptions = useMemo(() => neighborhoodsOf(clubs.filter((c) => !zoneSel || zoneOf(c) === zoneSel)).slice(0, 12).map((n) => n.name), [clubs, zoneSel])

  // Con sesión: se preseleccionan estilo, tipo de local y barrio según favoritos y visitas, solo
  // como punto de partida y solo si la persona aún no ha tocado nada.
  useEffect(() => {
    if (!userId || clubs.length === 0) return
    if (musicSet.size > 0 || venueTypeSet.size > 0 || areaSet.size > 0) return

    const detect = async () => {
      const [{ data: favData }, { data: visitData }] = await Promise.all([
        supabase.from("favorites").select("item_id").eq("user_id", userId).eq("item_type", "club"),
        supabase.from("analytics").select("item_id").eq("user_id", userId).eq("item_type", "club").eq("event_type", "page_view").limit(30),
      ])
      const ids = new Set<string>([...(favData || []).map((f: any) => String(f.item_id)), ...(visitData || []).map((v: any) => String(v.item_id))])
      if (ids.size === 0) return
      const history = clubs.filter((c) => ids.has(String(c.id)))
      if (history.length === 0) return

      const top = (options: string[], matches: (c: any, opt: string) => boolean) => {
        const counts: Record<string, number> = {}
        history.forEach((c) => options.forEach((opt) => matches(c, opt) && (counts[opt] = (counts[opt] || 0) + 1)))
        return Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 2)
      }
      const topMusic = top(MUSIC_OPTIONS, (c, opt) => styleMatches(c.music, opt))
      const topVenue = top(VENUE_TYPE_OPTIONS.map((v) => v.value), (c, opt) => c.venue_type === opt)
      const topArea = top(areaOptions, (c, opt) => c.neighborhood === opt)
      if (topMusic.length === 0 && topVenue.length === 0 && topArea.length === 0) return
      if (topMusic.length > 0) setMusicSet(new Set(topMusic))
      if (topVenue.length > 0) setVenueTypeSet(new Set(topVenue))
      if (topArea.length > 0) setAreaSet(new Set(topArea))
      setAutoDetected(true)
    }
    detect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, clubs])

  const budgetMax = BUDGET_OPTIONS.find((b) => b.key === budgetKey)?.max ?? 9999
  const planDate = planDateFor(dayOffset)
  const todayStr = dateKey(planDate)
  const todayFormatted = cap(planDate.toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long" }))

  const STEP_TITLES = [
    t("planPage.stepGroup"), t("planPage.stepBudget"), t("planPage.stepVibe"),
    t("planPage.stepVenueType"), t("planPage.stepMusic"), t("planPage.stepArea"), t("planPage.stepFinal"),
  ]
  const LOADING_MESSAGES = [t("planPage.loading1"), t("planPage.loading2"), t("planPage.loading3"), t("planPage.loading4"), t("planPage.loading5")]

  const styleLabel = (slug: string) => cap(t(`areas.style.${slug}`))
  const dressLabel = (d: string) => (d === "any" ? t("planPage.dressAny") : d === "Elegante" ? t("planPage.dressElegant") : d)

  const selectVibe = (key: string) => {
    if (vibeKey === key) {
      setVibeKey(null)
      return
    }
    setVibeKey(key)
    if (VIBE_PRESETS.find((v) => v.key === key)?.lgtbi) setLgtbi(true)
    const hint = VIBE_MUSIC_HINT[key]
    if (hint && musicSet.size === 0) setMusicSet(new Set([hint]))
  }

  // Analítica: una fila por plan generado con la combinación de filtros elegida.
  const trackPlanFilters = async () => {
    const parts: string[] = []
    if (venueTypeSet.size > 0) parts.push(`tipo:${Array.from(venueTypeSet).join("/")}`)
    if (musicSet.size > 0) parts.push(`musica:${Array.from(musicSet).join("/")}`)
    if (areaSet.size > 0) parts.push(`zona:${Array.from(areaSet).join("/")}`)
    if (dresscode !== "any") parts.push(`dresscode:${dresscode}`)
    if (parts.length === 0) return
    await track("filter_used", { itemType: "plan", itemName: parts.join(" | ") })
  }

  const generatePlan = () => {
    trackPlanFilters()
    setPhase("loading")
    setLoadingMsgIndex(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setLoadingMsgIndex(i % LOADING_MESSAGES.length)
    }, 400)
    setTimeout(() => {
      clearInterval(interval)
      computePlan()
      setPhase("results")
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100)
    }, 1200)
  }

  const computePlan = () => {
    const prefs: Prefs = { groupKey, budgetMax, vibeKey, musicSet, areaSet, venueTypeSet, dresscode, lgtbi, mature }
    // Pequeño factor aleatorio: con puntuaciones parecidas, "Rehacer plan" da variedad real.
    const jitter = () => Math.random() * 8
    const dow = planDate.getDay()

    const allScoredClubs = clubs
      .filter((c) => !c.sold_out)
      .filter((c) => !zoneSel || zoneOf(c) === zoneSel)
      .filter((c) => clubOpensOn(c.hours, c.open_days, dow) !== false)
      .map((c) => ({ ...c, ...scoreClub(c, prefs, t) }))
      .map((c) => ({ ...c, sortScore: c.score + jitter() }))
      .sort((a, b) => b.sortScore - a.sortScore)

    const freshClubs = allScoredClubs.filter((c) => !seenClubIds.has(String(c.id)))
    const scoredClubs = freshClubs.length >= 2 ? freshClubs : allScoredClubs

    const scoredEvents = events
      .filter((e) => !e.sold_out)
      .filter((e) => !zoneSel || zoneOf(e) === zoneSel)
      .map((e) => ({ ...e, ...scoreEvent(e, prefs, todayStr, t) }))
      .sort((a, b) => b.score - a.score)

    // Los eventos de esa noche entran en el plan (el mejor) o como alternativas.
    const onThatNight = scoredEvents.filter((e) => eventOnDate(e, todayStr))
    const tonightEvent = onThatNight[0]
    const later = scoredEvents.filter((e) => e.date && e.date > todayStr).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    const upcoming = [...onThatNight.slice(1, 4), ...later].slice(0, 6)

    const top = scoredClubs[0]
    const second = scoredClubs[1]

    // Alternativas: primero las del mismo barrio o dresscode que el plan principal.
    const rest = allScoredClubs.filter((c) => c.id !== top?.id && c.id !== second?.id)
    const close = top ? rest.filter((c) => c.neighborhood === top.neighborhood || (top.dresscode && c.dresscode === top.dresscode)) : []
    const alts = [...close, ...rest.filter((c) => !close.includes(c))].slice(0, 4)

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
        href: `/event/${tonightEvent.slug || createSlug(tonightEvent.title)}`,
        mapHref: tonightEvent.latitude && tonightEvent.longitude ? `/map?type=events&id=${tonightEvent.id}` : null,
      })
      cursor = addMinutes(tonightEvent.start_time || win.start, 120)
    }
    for (const club of [top, second]) {
      if (!club) continue
      newStops.push({
        id: `club-${club.id}`,
        time: cursor,
        kind: "club",
        title: club.name,
        subtitle: club.neighborhood || "Barcelona",
        reasons: (club.reasons || []).slice(0, 3),
        image: club.image,
        href: `/clubs/${club.slug || createSlug(club.name)}`,
        mapHref: club.latitude && club.longitude ? `/map?type=clubs&id=${club.id}` : null,
      })
      cursor = addMinutes(cursor, 120)
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
    setDresscode("any")
    setTimeKey("peak")
    setLgtbi(false)
    setMature(false)
    setDayOffset(0)
    setPhase("form")
    setStep(0)
    setSeenClubIds(new Set())
  }

  const editPlan = () => {
    setPhase("form")
    setStep(0)
    setSeenClubIds(new Set())
  }

  const option = (active: boolean) =>
    `rounded-card border p-5 text-left transition ${active ? "border-brand bg-brand/15" : "border-white/10 bg-surface hover:border-white/25"}`
  const chip = (active: boolean) =>
    `rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"}`
  const primaryBtn = "flex-1 rounded-ctl bg-brand py-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
  const secondaryBtn = "rounded-ctl border border-white/15 bg-white/5 px-6 py-4 text-sm font-semibold text-ink transition hover:bg-white/10"

  const selectedVibe = VIBE_PRESETS.find((v) => v.key === vibeKey)

  if (isLoggedIn === null) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-night pt-24 text-center text-sm text-zinc-400">{t("common.loading")}</main>
        <BottomNav />
      </>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <Header />
        <LoginWall titleKey="nav.plan" subtitleKey="planPage.notLoggedInSubtitle" />
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="relative min-h-screen bg-night pb-40 text-ink">
        <section className="mx-auto max-w-2xl px-4 pb-8 pt-10 sm:pt-14">
          <h1 className="font-display text-[2.1rem] leading-[1.06] sm:text-6xl">{t("nav.plan")}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300">{t("planPage.subtitle")}</p>
        </section>

        {loading ? (
          <p className="text-center text-sm text-zinc-400">{t("common.loading")}</p>
        ) : (
          <>
            {phase === "form" && (
              <section className="mx-auto max-w-2xl px-4">
                <div className="mb-3 flex items-center gap-1.5" aria-hidden="true">
                  {STEP_TITLES.map((title, i) => (
                    <div key={title} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-brand" : "bg-white/10"}`} />
                  ))}
                </div>
                <p className="mb-6 text-sm text-zinc-400">
                  {t("planPage.stepOf").replace("{n}", String(step + 1)).replace("{total}", String(STEP_TITLES.length))} ·{" "}
                  <span className="font-semibold text-ink">{STEP_TITLES[step]}</span>
                </p>

                <div key={step}>
                  {step === 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {GROUP_OPTIONS.map((g) => {
                        const I = g.icon
                        return (
                          <button key={g.key} onClick={() => setGroupKey(g.key)} aria-pressed={groupKey === g.key} className={option(groupKey === g.key)}>
                            <I size={24} className="text-brand-soft" />
                            <p className="mt-3 font-semibold text-ink">{t(`planPage.group_${g.key}`)}</p>
                            <p className="mt-1 text-sm text-zinc-400">{t(`planPage.group_${g.key}_desc`)}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid grid-cols-2 gap-3">
                      {BUDGET_OPTIONS.map((b) => {
                        const I = b.icon
                        return (
                          <button key={b.key} onClick={() => setBudgetKey(b.key)} aria-pressed={budgetKey === b.key} className={option(budgetKey === b.key)}>
                            <I size={24} className="text-brand-soft" />
                            <p className="mt-3 font-semibold text-ink">{t(`planPage.budget_${b.key}`)}</p>
                            <p className="mt-1 text-sm text-zinc-400">{b.range}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {VIBE_PRESETS.map((v) => {
                        const I = v.icon
                        return (
                          <button key={v.key} onClick={() => selectVibe(v.key)} aria-pressed={vibeKey === v.key} className={option(vibeKey === v.key)}>
                            <I size={24} className="text-brand-soft" />
                            <p className="mt-3 font-semibold text-ink">{t(`planPage.vibe_${v.key}`)}</p>
                            <p className="mt-1 text-xs leading-snug text-zinc-400">{t(`planPage.vibe_${v.key}_desc`)}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <p className="mb-4 text-sm text-zinc-300">{t("planPage.venueTypeInstruction")}</p>
                      {autoDetected && <p className="mb-4 text-sm text-brand-soft">{t("planPage.autoDetectedNote")}</p>}
                      <div className="flex flex-wrap gap-2">
                        {VENUE_TYPE_OPTIONS.map((v) => (
                          <button key={v.value} onClick={() => setVenueTypeSet((s) => toggleInSet(s, v.value))} aria-pressed={venueTypeSet.has(v.value)} className={chip(venueTypeSet.has(v.value))}>
                            {t(`planPage.${v.key}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div>
                      <p className="mb-4 text-sm text-zinc-300">{t("planPage.musicInstruction")}</p>
                      <div className="flex flex-wrap gap-2">
                        {MUSIC_OPTIONS.map((m) => (
                          <button key={m} onClick={() => setMusicSet((s) => toggleInSet(s, m))} aria-pressed={musicSet.has(m)} className={chip(musicSet.has(m))}>
                            {styleLabel(m)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div>
                      {zonesPresent(clubs).length > 1 && (
                        <div className="mb-5 flex flex-wrap gap-2">
                          {["", ...zonesPresent(clubs)].map((z) => (
                            <button key={z || "all"} onClick={() => { setZoneSel(z); setAreaSet(new Set()) }} aria-pressed={zoneSel === z} className={chip(zoneSel === z)}>
                              {z === "" ? t("essentialsPage.allArea") : z}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="mb-4 text-sm text-zinc-300">{t("planPage.areaInstruction")}</p>
                      <div className="flex flex-wrap gap-2">
                        {areaOptions.map((a) => (
                          <button key={a} onClick={() => setAreaSet((s) => toggleInSet(s, a))} aria-pressed={areaSet.has(a)} className={chip(areaSet.has(a))}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="space-y-8">
                      <div>
                        <p className="mb-3 text-sm font-semibold text-zinc-300">{t("planPage.whichNight")}</p>
                        <div className="flex flex-wrap gap-2">
                          {[0, 1, 2, 3, 4, 5, 6].map((off) => {
                            const d = planDateFor(off)
                            const label = off === 0 ? t("nav.tonight") : off === 1 ? t("planPage.tomorrow") : cap(d.toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric" }))
                            return (
                              <button key={off} onClick={() => setDayOffset(off)} aria-pressed={dayOffset === off} className={chip(dayOffset === off)}>
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-semibold text-zinc-300">{t("planPage.departureTimeQuestion")}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(TIME_WINDOWS).map(([key, w]) => {
                            const I = w.icon
                            return (
                              <button key={key} onClick={() => setTimeKey(key as typeof timeKey)} aria-pressed={timeKey === key} className={option(timeKey === key)}>
                                <I size={20} className="text-brand-soft" />
                                <p className="mt-2 text-sm font-semibold text-ink">{t(`planPage.time_${key}`)}</p>
                                <p className="text-xs text-zinc-400">{t(`planPage.time_${key}_desc`)}</p>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-semibold text-zinc-300">{t("planPage.dresscode")}</p>
                        <div className="flex flex-wrap gap-2">
                          {DRESSCODE_OPTIONS.map((d) => (
                            <button key={d} onClick={() => setDresscode(d)} aria-pressed={dresscode === d} className={chip(dresscode === d)}>
                              {dressLabel(d)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-ctl border border-white/10 bg-surface px-4 py-3.5 text-sm font-semibold text-ink">
                          <input type="checkbox" checked={lgtbi} onChange={() => setLgtbi(!lgtbi)} className="h-4 w-4 accent-[#7c5cff]" />
                          {t("planPage.lgtbiPriority")}
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-ctl border border-white/10 bg-surface px-4 py-3.5 text-sm font-semibold text-ink">
                          <input type="checkbox" checked={mature} onChange={() => setMature(!mature)} className="h-4 w-4 accent-[#7c5cff]" />
                          {t("planPage.mature")}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  {step > 0 && (
                    <button onClick={() => setStep((s) => s - 1)} className={secondaryBtn}>
                      {t("common.back")}
                    </button>
                  )}
                  {step < STEP_TITLES.length - 1 ? (
                    <button onClick={() => setStep((s) => s + 1)} className={primaryBtn}>
                      {t("planPage.next")}
                    </button>
                  ) : (
                    <button onClick={generatePlan} className={primaryBtn}>
                      {t("planPage.generatePlanCta")}
                    </button>
                  )}
                </div>
                {step < STEP_TITLES.length - 1 && (
                  <button onClick={generatePlan} className="mt-4 w-full text-center text-sm font-semibold text-zinc-400 underline-offset-4 hover:text-ink hover:underline">
                    {t("planPage.skipToPlan")}
                  </button>
                )}
              </section>
            )}

            {phase === "loading" && (
              <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center" aria-live="polite">
                <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-brand motion-reduce:animate-none" />
                <p className="text-lg font-semibold text-ink">{LOADING_MESSAGES[loadingMsgIndex]}</p>
              </section>
            )}

            {phase === "results" && (
              <section id="results" className="mx-auto max-w-3xl scroll-mt-20 px-4">
                {noResults ? (
                  <div className="rounded-card border border-white/10 bg-surface px-6 py-16 text-center">
                    <p className="text-lg font-semibold text-ink">{t("planPage.noResultsTitle")}</p>
                    <p className="mt-2 text-sm text-zinc-400">{t("planPage.noResultsSubtitle")}</p>
                    <button onClick={resetFilters} className={`${secondaryBtn} mt-6`}>
                      {t("planPage.removeFilters")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="rounded-card border border-brand/30 bg-brand/10 p-6">
                      <p className="text-sm font-semibold text-brand-soft">{t("planPage.yourPassTonight")}</p>
                      <p className="font-display mt-1 text-2xl text-ink">{todayFormatted}</p>
                      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-4">
                        <div>
                          <dt className="text-xs text-zinc-400">{t("planPage.stepGroup")}</dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">{t(`planPage.group_${groupKey}`)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-400">{t("planPage.stepBudget")}</dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">{t(`planPage.budget_${budgetKey}`)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-400">{t("planPage.stepVibe")}</dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">{selectedVibe ? t(`planPage.vibe_${selectedVibe.key}`) : t("planPage.surprise")}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-400">{t("event.schedule")}</dt>
                          <dd className="mt-1 text-sm font-semibold text-ink">{t(`planPage.time_${timeKey}`)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h2 className="mb-5 text-lg font-semibold">{t("planPage.yourItinerary")}</h2>
                      <ol className="relative space-y-5 border-l border-white/15 pl-6">
                        {stops.map((stop) => (
                          <li key={stop.id} className="relative">
                            <span className="absolute -left-[37px] top-4 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-night text-brand-soft">
                              {stop.kind === "event" ? <Ticket size={13} /> : <Disc3 size={13} />}
                            </span>
                            <Link href={stop.href} className="flex gap-4 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25">
                              {stop.image && (
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-ctl">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={stop.image} alt="" className="h-full w-full object-cover" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-soft">
                                    <Clock size={14} /> {stop.time}
                                  </span>
                                  {stop.mapHref && <MapIcon size={16} className="text-zinc-400" aria-hidden="true" />}
                                </div>
                                <p className="mt-1 truncate text-lg font-semibold text-ink">{stop.title}</p>
                                <p className="truncate text-sm text-zinc-400">{stop.subtitle}</p>
                                {stop.reasons.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {stop.reasons.map((r) => (
                                      <span key={r} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <SharePlanButton
                      title={t("planPage.shareTitle").replace("{date}", todayFormatted)}
                      stops={stops.map((st) => ({ kind: st.kind, title: st.title, subtitle: st.subtitle, time: st.time, image: st.image, href: st.href }))}
                    />

                    {alternatives.length > 0 && (
                      <div>
                        <h2 className="mb-4 text-lg font-semibold">{t("planPage.otherGems")}</h2>
                        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                          {alternatives.map((club) => (
                            <Link key={club.id} href={`/clubs/${club.slug || createSlug(club.name)}`} className="w-48 shrink-0 overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25">
                              <div className="h-28 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={club.image || FALLBACK_IMAGE} alt="" className="h-full w-full object-cover" />
                              </div>
                              <div className="p-3">
                                <p className="truncate text-sm font-semibold text-ink">{club.name}</p>
                                <p className="truncate text-xs text-zinc-400">{club.neighborhood || "Barcelona"}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherEvents.length > 0 && (
                      <div>
                        <h2 className="mb-4 text-lg font-semibold">{t("planPage.upcomingEventsForYou")}</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {otherEvents.map((event) => (
                            <Link key={event.id} href={`/event/${event.slug || createSlug(event.title)}`} className="flex items-center gap-4 rounded-card border border-white/10 bg-surface p-3 transition hover:border-white/25">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-ctl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={event.image || FALLBACK_IMAGE} alt="" className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                                <p className="text-xs text-zinc-400">
                                  {event.date
                                    ? cap(new Date(`${event.date}T12:00:00`).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" }))
                                    : t("eventPage.dateTbc")}
                                  {event.price ? ` · ${event.price}` : ""}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={editPlan} className={`${secondaryBtn} flex-1`}>
                        {t("planPage.editPreferences")}
                      </button>
                      <button onClick={generatePlan} className={primaryBtn}>
                        {t("planPage.redoPlan")}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </>
  )
}
