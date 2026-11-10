"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { ChevronDown, ChevronLeft, Clock, Dices, Disc3, Heart, MapPin, MessageCircle, Mic2, Moon, Music2, SlidersHorizontal, Sparkles, Sun, Ticket, Users, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import SurpriseRoulette from "./SurpriseRoulette"
import SharePlanButton from "../plan/SharePlanButton"
import NocSays, { useOwnLevelColor } from "../mascot/NocSays"
import { useLanguage } from "../../context/LanguageContext"
import { getDeniedClubIds } from "../../lib/deniedVenues"
import { effectiveHoursStatus, effectiveOpenNow } from "../../lib/scheduleNotices"
import { createSlug } from "../../lib/slug"
import { zonesPresent } from "../../lib/zones"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { formatDistance, walkingDirectionsUrl, walkingMinutes } from "../../lib/geo"
import { clubDistance, hasFreeEntry, MOOD_IDS, moodScore, NO_EXTRAS, pickSurprise, type Extras, type Mood, type SurpriseNote } from "../../lib/surprise"

// «Sorpréndeme» (rediseño completo el 05/11/2026).
//
// Antes había que rellenar un formulario (cinco chips de rollo, tres extras, zonas con scroll y «cerca de
// mí») antes de poder pulsar nada, y las elecciones no se veían reflejadas hasta el final. Ahora no hay
// formulario previo: al abrir, ya te propone UN sitio (con una ruleta de nombres que frena en el elegido)
// y las elecciones viven arriba, siempre a la vista: el rollo (Todo, Bailar, Charlar, Chill, Directo) y
// «Filtros» (cerca de mí, entrada gratis, terraza, ambiente LGTBI+, zona). Cambiar cualquiera vuelve a
// tirar al instante, así se ve qué hace cada filtro. «Otra opción» no repite; la flecha vuelve atrás.
// La lógica de elección está en lib/surprise.ts (con tests) y no ha cambiado.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>

const MOOD_ICON: Record<Mood, LucideIcon> = { any: Sparkles, dance: Disc3, chat: MessageCircle, chill: Moon, live: Mic2 }
const MOOD_KEY: Record<Mood, string> = {
  any: "surprise.tileAny",
  dance: "surprise.tileDance",
  chat: "surprise.tileChat",
  chill: "surprise.tileChill",
  live: "surprise.tileLive",
}
const NOTE_KEY: Record<Exclude<SurpriseNote, "">, string> = {
  extras: "surprise.tierExtras",
  moodLater: "surprise.tierMoodLater",
  otherOpen: "surprise.tierOtherOpen",
  later: "surprise.tierLater",
}
const VIBE_KEY: Record<string, string> = { tranquilo: "clubPage.vibeQuiet", animado: "clubPage.vibeBusy", lleno: "clubPage.vibeFull" }
const LIVE_STATUS_MAX_AGE_MS = 4 * 60 * 60 * 1000
const PREFS_KEY = "noctua_surprise_v1"

// Ruleta de casino (SurpriseRoulette): la rueda gira frenando, la bola cae en una casilla y debajo pasan
// REEL_FILL nombres de locales posibles al azar; el último es el elegido. ROULETTE_MS es lo que dura la
// tirada y ROULETTE_HOLD el rato que se deja la bola quieta en su casilla antes de enseñar el local.
const REEL_FILL = 14
const ROULETTE_MS = 3200
const ROULETTE_HOLD = 650

const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Fact = { key: string; Icon: LucideIcon; text: string; sub?: string; tone?: "good" }
type Tag = { key: string; text: string; strong?: boolean }
type Filters = { mood: Mood; extras: Extras; zone: string; near: boolean; pos: { lat: number; lon: number } | null }

function loadPrefs(): { mood: Mood; zone: string; extras: Extras } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "null")
    if (raw && typeof raw === "object") {
      return {
        mood: MOOD_IDS.includes(raw.mood) ? raw.mood : "any",
        zone: typeof raw.zone === "string" ? raw.zone : "",
        extras: { free: !!raw.extras?.free, terrace: !!raw.extras?.terrace, lgtbi: !!raw.extras?.lgtbi },
      }
    }
  } catch {
    /* sin almacenamiento: se usa lo de por defecto */
  }
  return { mood: "any", zone: "", extras: NO_EXTRAS }
}

function directionsUrl(club: Club, pos: { lat: number; lon: number } | null): string | null {
  const lat = Number(club.latitude)
  const lon = Number(club.longitude)
  if (lat && lon) {
    return pos
      ? walkingDirectionsUrl(pos.lat, pos.lon, lat, lon)
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`
  }
  if (club.address) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${club.name} ${club.address}`)}`
  return null
}

const shortZone = (z: string) => z.replace(" de Llobregat", "").replace(" de Besòs", "").replace(" de Gramenet", "")

export default function SurpriseMe({ clubs }: { clubs: Club[] }) {
  const { t } = useLanguage()
  const levelColor = useOwnLevelColor()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<"spin" | "result" | "empty">("spin")
  const [mood, setMood] = useState<Mood>("any")
  const [extras, setExtras] = useState<Extras>(NO_EXTRAS)
  const [zone, setZone] = useState("")
  const [near, setNear] = useState(false)
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [zoneOpen, setZoneOpen] = useState(false) // lista de zonas desplegada bajo los filtros
  const zoneChipRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!filtersOpen) setZoneOpen(false)
  }, [filtersOpen])
  const [denied, setDenied] = useState<Set<number>>(() => new Set())
  const [strip, setStrip] = useState<string[]>([])
  const [spinKey, setSpinKey] = useState(0)
  const [trail, setTrail] = useState<{ items: Club[]; at: number }>({ items: [], at: -1 })
  const [seen, setSeen] = useState<number[]>([])
  const [note, setNote] = useState<SurpriseNote>("")
  const [revealed, setRevealed] = useState(false)
  const [openCount, setOpenCount] = useState(0)
  const prefsLoaded = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
    const p = loadPrefs()
    setMood(p.mood)
    setZone(p.zone)
    setExtras(p.extras)
    prefsLoaded.current = true
    getDeniedClubIds().then(setDenied).catch(() => {})
  }, [])

  // Recuerda lo último que elegiste (rollo, zona y extras; la ubicación no, pide permiso cada vez).
  useEffect(() => {
    if (!prefsLoaded.current) return
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ mood, zone, extras }))
    } catch {
      /* sin almacenamiento */
    }
  }, [mood, zone, extras])

  // Cuántos sitios hay abiertos ahora (se calcula tras montar: depende de la hora del navegador).
  useEffect(() => {
    setOpenCount(clubs.filter((c) => c && c.name && !denied.has(Number(c.id)) && effectiveOpenNow(c) === true).length)
  }, [clubs, denied])

  const clearSpin = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
      clearSpin()
    }
  }, [open, clearSpin])

  // El foco entra en la hoja al abrirla y, si al cambiar de fase se pierde (desaparece el botón pulsado),
  // vuelve a ella; si sigue dentro (un filtro, por ejemplo) no se toca.
  useEffect(() => {
    if (!open) return
    const root = dialogRef.current
    if (root && !root.contains(document.activeElement)) root.focus()
  }, [open, phase])

  useEffect(() => {
    if (phase !== "result") {
      setRevealed(false)
      return
    }
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [phase, trail.at])

  const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  // Tira el dado. `over` permite probar un filtro nuevo sin esperar a que React actualice el estado;
  // `fresh` empieza de cero (nuevo filtro = se pueden repetir los que ya habían salido).
  const draw = useCallback(
    (over: Partial<Filters> = {}, fresh = false) => {
      const f: Filters = { mood, extras, zone, near, pos, ...over }
      const res = pickSurprise({ clubs, mood: f.mood, extras: f.extras, zone: f.zone, near: f.near, pos: f.pos, denied, seen: fresh ? [] : seen })
      clearSpin()
      if (!res) {
        setPhase("empty")
        return
      }
      const chosen = res.club
      const finish = () => {
        setNote(res.note)
        setSeen((s) => (fresh ? [chosen.id] : [...s, chosen.id]))
        setTrail((tr) => (fresh ? { items: [chosen], at: 0 } : { items: [...tr.items.slice(0, tr.at + 1), chosen], at: tr.at + 1 }))
        setPhase("result")
        try {
          if (!reduceMotion()) navigator.vibrate?.(15)
        } catch {
          /* sin vibración */
        }
      }
      if (reduceMotion()) {
        finish()
        return
      }
      // Nombres que «pasan» por la ruleta: al azar entre los posibles, sin repetir seguidos y sin el elegido.
      const pool = res.candidates.filter((c) => c.id !== chosen.id)
      const fill: Club[] = []
      let last: Club | null = null
      for (let i = 0; i < REEL_FILL && pool.length > 0; i++) {
        const options: Club[] = pool.length > 1 ? pool.filter((c) => c !== last) : pool
        last = options[Math.floor(Math.random() * options.length)]
        fill.push(last)
      }
      setStrip([...fill, chosen].map((c) => c.name))
      setSpinKey((k) => k + 1)
      setNote("")
      setPhase("spin")
      timers.current.push(setTimeout(finish, ROULETTE_MS + ROULETTE_HOLD))
    },
    [clubs, mood, extras, zone, near, pos, denied, seen, clearSpin]
  )

  // Al abrir ya hay sitio: no hay formulario previo.
  useEffect(() => {
    if (open) draw({}, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pickMood = (m: Mood) => {
    if (m === mood) {
      draw()
      return
    }
    setMood(m)
    draw({ mood: m }, true)
  }

  const toggleExtra = (k: keyof Extras) => {
    const next = { ...extras, [k]: !extras[k] }
    setExtras(next)
    draw({ extras: next }, true)
  }

  const pickZone = (z: string) => {
    setZone(z)
    draw({ zone: z }, true)
  }

  const toggleNear = () => {
    if (locating) return
    setGeoError("")
    if (near) {
      setNear(false)
      draw({ near: false }, true)
      return
    }
    if (pos) {
      setNear(true)
      draw({ near: true }, true)
      return
    }
    if (!navigator.geolocation) {
      setGeoError(t("surprise.geoUnsupported"))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lon: p.coords.longitude }
        setPos(here)
        setNear(true)
        setLocating(false)
        draw({ near: true, pos: here }, true)
      },
      (err) => {
        setLocating(false)
        setGeoError(err.code === 1 ? t("surprise.geoBlocked") : t("surprise.geoFailed"))
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    )
  }

  // «Quitar filtros» de la fila de filtros: borra solo los filtros (cerca, gratis, terraza, LGTBI+, zona) y
  // deja el rollo elegido; vuelve a tirar con lo que queda.
  const clearExtraFilters = () => {
    setExtras(NO_EXTRAS)
    setZone("")
    setNear(false)
    setGeoError("")
    draw({ mood, extras: NO_EXTRAS, zone: "", near: false }, true)
  }

  const clearFilters = () => {
    setMood("any")
    setExtras(NO_EXTRAS)
    setZone("")
    setNear(false)
    setGeoError("")
    draw({ mood: "any", extras: NO_EXTRAS, zone: "", near: false }, true)
  }

  const close = () => {
    clearSpin()
    setOpen(false)
    setPhase("spin")
    setStrip([])
    setTrail({ items: [], at: -1 })
    setSeen([])
    setNote("")
    setFiltersOpen(false)
    setZoneOpen(false)
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const back = () => {
    setTrail((tr) => (tr.at > 0 ? { ...tr, at: tr.at - 1 } : tr))
    setNote("")
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== "Tab") return
    const root = dialogRef.current
    if (!root) return
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
    if (nodes.length === 0) return
    const first = nodes[0]
    const lastNode = nodes[nodes.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault()
      lastNode.focus()
    } else if (!e.shiftKey && active === lastNode) {
      e.preventDefault()
      first.focus()
    }
  }

  const card: Club | null = phase === "result" ? trail.items[trail.at] || null : null
  const dist = card ? clubDistance(card, pos) : null
  const isOpenNow = card ? effectiveOpenNow(card) : null

  // Lo que se cuenta del sitio: datos (horario, distancia, música, entrada) y etiquetas (terraza,
  // LGTBI+, pista…). Si encaja con el rollo elegido, esa etiqueta va primera y destacada.
  const { facts, tags } = useMemo<{ facts: Fact[]; tags: Tag[] }>(() => {
    const facts: Fact[] = []
    const tags: Tag[] = []
    if (!card) return { facts, tags }
    const status = effectiveHoursStatus(card)
    if (status?.open) facts.push({ key: "hours", Icon: Clock, text: t("surprise.openUntil").replace("{t}", status.at), tone: "good" })
    else if (status) facts.push({ key: "hours", Icon: Clock, text: t("surprise.opensAt").replace("{t}", status.at) })
    if (card.music) facts.push({ key: "music", Icon: Music2, text: String(card.music) })
    if (hasFreeEntry(card)) facts.push({ key: "free", Icon: Ticket, text: t("surprise.extraFree"), sub: String(card.free_entry_info), tone: "good" })
    else if (card.price) facts.push({ key: "price", Icon: Ticket, text: t("surprise.price").replace("{p}", String(card.price)) })
    if (card.age_min) facts.push({ key: "age", Icon: Users, text: t("surprise.minAge").replace("{n}", String(card.age_min)) })

    if (mood !== "any" && moodScore(card, mood) > 0) tags.push({ key: "mood", text: t(MOOD_KEY[mood]), strong: true })
    const vibeKey = card.live_status && VIBE_KEY[card.live_status]
    const fresh = card.live_status_updated_at && Date.now() - new Date(card.live_status_updated_at).getTime() < LIVE_STATUS_MAX_AGE_MS
    if (vibeKey && fresh) tags.push({ key: "vibe", text: t("surprise.vibe").replace("{v}", t(vibeKey)) })
    if (card.terrace) tags.push({ key: "terrace", text: t("surprise.extraTerrace") })
    if (card.lgtbi_friendly) tags.push({ key: "lgtbi", text: t("surprise.extraLgtbi") })
    if (card.dance_floor) tags.push({ key: "dance", text: t("surprise.reasonDance") })
    if (card.live_music) tags.push({ key: "live", text: t("surprise.reasonLive") })
    if (card.cocktails) tags.push({ key: "cocktails", text: t("surprise.reasonCocktails") })
    return { facts, tags }
  }, [card, mood, t])

  const zones = useMemo(() => zonesPresent(clubs), [clubs])
  const href = card ? `/clubs/${card.slug || createSlug(card.name)}` : "#"
  const directions = card ? directionsUrl(card, pos) : null
  const activeFilters = (extras.free ? 1 : 0) + (extras.terrace ? 1 : 0) + (extras.lgtbi ? 1 : 0) + (near ? 1 : 0) + (zone ? 1 : 0)

  const announce = phase === "spin" ? t("surprise.thinking") : card ? t("surprise.announce").replace("{name}", card.name) : ""

  const on = "bg-white text-[#0a0910]"
  const off = "bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-[#2c2937]"
  const chipBase =
    "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition active:scale-[0.98] motion-reduce:transition-none"

  return (
    <>
      <div className="flex flex-col gap-4 rounded-card border border-white/10 bg-[#14111c] p-5 sm:flex-row sm:items-center sm:justify-between">
        <NocSays />
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-center">
          <button
            ref={triggerRef}
            onClick={() => setOpen(true)}
            className="btn-pill btn-primary inline-flex items-center justify-center gap-2 px-7 py-4 text-sm active:scale-95 motion-reduce:transition-none"
          >
            <Dices size={18} aria-hidden="true" /> {t("surprise.cta")}
          </button>
          {openCount > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-300">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-open" />
              {t("surprise.openCount").replace("{n}", String(openCount))}
            </p>
          )}
        </div>
      </div>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-6"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close()
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={t("surprise.cta")}
              tabIndex={-1}
              onKeyDown={onKeyDown}
              className="relative flex h-[min(780px,94dvh)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 outline-none sm:rounded-3xl"
            >
              <p role="status" aria-live="polite" className="sr-only">
                {announce}
              </p>

              {/* Cabecera */}
              <div className="flex items-center gap-2 px-5 pb-3 pt-5">
                <div className="hidden shrink-0 min-[360px]:block">
                  <NocOwl size={38} pose="dado" mood={phase === "spin" ? "wow" : "happy"} levelColor={levelColor} />
                </div>
                <h2 className="mr-auto min-w-0 truncate pl-1 font-display text-[15px] leading-none text-white min-[360px]:text-[17px]">{t("surprise.cta")}</h2>
                <button
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                  aria-controls="surprise-filters"
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition motion-reduce:transition-none ${filtersOpen || activeFilters > 0 ? on : off}`}
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  <span className="hidden min-[360px]:inline">{t("surprise.filters")}</span>
                  <span className="sr-only min-[360px]:hidden">{t("surprise.filters")}</span>
                  {activeFilters > 0 && (
                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#0a0910] px-1 text-[10px] font-black leading-none text-white">{activeFilters}</span>
                  )}
                </button>
                <button
                  onClick={close}
                  aria-label={t("surprise.close")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] transition hover:bg-[#2c2937]"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {/* Rollo: siempre a la vista, un toque y vuelve a tirar */}
              <div role="radiogroup" aria-label={t("surprise.question")} className="grid grid-cols-5 gap-1.5 px-5">
                {MOOD_IDS.map((id) => {
                  const MoodIcon = MOOD_ICON[id]
                  return (
                    <button
                      key={id}
                      role="radio"
                      aria-checked={mood === id}
                      onClick={() => pickMood(id)}
                      className={`flex h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-0.5 text-[11px] font-bold leading-none transition active:scale-95 motion-reduce:transition-none ${mood === id ? on : off}`}
                    >
                      <MoodIcon size={20} aria-hidden="true" />
                      <span className="max-w-full truncate">{t(MOOD_KEY[id])}</span>
                    </button>
                  )
                })}
              </div>

              {/* Filtros: debajo del rollo, solo cuando se piden. Se pliegan en varias filas (06/11/2026): la fila con scroll
                  horizontal no se podía deslizar con el ratón ni se veía que había más a la derecha. */}
              {filtersOpen && (
                <div id="surprise-filters" className="mt-2 flex flex-wrap gap-2 px-5 pb-1">
                  <button onClick={toggleNear} aria-pressed={near} className={`${chipBase} ${near ? on : off}`}>
                    <MapPin size={15} aria-hidden="true" className="shrink-0" />
                    {locating ? t("surprise.locating") : t("surprise.nearOff")}
                  </button>
                  <button onClick={() => toggleExtra("free")} aria-pressed={extras.free} className={`${chipBase} ${extras.free ? on : off}`}>
                    <Ticket size={15} aria-hidden="true" className="shrink-0" />
                    {t("surprise.extraFree")}
                  </button>
                  <button onClick={() => toggleExtra("terrace")} aria-pressed={extras.terrace} className={`${chipBase} ${extras.terrace ? on : off}`}>
                    <Sun size={15} aria-hidden="true" className="shrink-0" />
                    {t("surprise.extraTerrace")}
                  </button>
                  <button onClick={() => toggleExtra("lgtbi")} aria-pressed={extras.lgtbi} className={`${chipBase} ${extras.lgtbi ? on : off}`}>
                    <Heart size={15} aria-hidden="true" className="shrink-0" />
                    {t("surprise.extraLgtbi")}
                  </button>
                  {zones.length > 1 && (
                    <button
                      ref={zoneChipRef}
                      onClick={() => setZoneOpen((v) => !v)}
                      aria-expanded={zoneOpen}
                      aria-controls="surprise-zones"
                      className={`${chipBase} ${zone || zoneOpen ? on : off}`}
                    >
                      <span className="sr-only">{t("surprise.zoneLabel")}: </span>
                      {zone ? shortZone(zone) : t("surprise.zoneLabel")}
                      <ChevronDown size={14} aria-hidden="true" className={`shrink-0 transition-transform motion-reduce:transition-none ${zoneOpen ? "rotate-180" : ""}`} />
                    </button>
                  )}
                  {activeFilters > 0 && (
                    <button
                      onClick={clearExtraFilters}
                      className={`${chipBase} border border-white/25 bg-transparent text-zinc-200 hover:bg-white/10`}
                    >
                      <X size={14} aria-hidden="true" className="shrink-0" />
                      {t("surprise.clearFilters")}
                    </button>
                  )}
                  {/* Zonas: en vez del desplegable nativo del navegador (en blanco y azul del sistema, cortado), todas las
                      zonas a la vista como chips, igual que el resto de filtros. Un toque elige y cierra. */}
                  {zones.length > 1 && zoneOpen && (
                    <div
                      id="surprise-zones"
                      role="radiogroup"
                      aria-label={t("surprise.zoneLabel")}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation()
                          setZoneOpen(false)
                          zoneChipRef.current?.focus()
                        }
                      }}
                      className="flex w-full flex-wrap gap-1.5 rounded-2xl bg-[#1a1724] p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
                    >
                      {["", ...zones].map((z) => (
                        <button
                          key={z || "all"}
                          role="radio"
                          aria-checked={zone === z}
                          onClick={() => {
                            pickZone(z)
                            setZoneOpen(false)
                          }}
                          className={`h-9 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 motion-reduce:transition-none ${
                            zone === z ? on : "bg-[#23202d] text-zinc-100 hover:bg-[#2c2937]"
                          }`}
                        >
                          {z ? shortZone(z) : t("surprise.allArea")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {geoError && (
                <p role="alert" className="px-5 pt-2 text-xs text-warn">
                  {geoError}
                </p>
              )}

              {/* Escenario */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
                {phase === "spin" && (
                  <div className="flex min-h-full flex-col justify-center gap-4">
                    <SurpriseRoulette key={spinKey} names={strip} durationMs={ROULETTE_MS} label={t("surprise.thinking")} />
                  </div>
                )}

                {phase === "empty" && (
                  <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
                    <NocOwl size={72} mood="sleepy" levelColor={levelColor} />
                    <p role="alert" className="max-w-[18rem] text-base font-bold text-white">
                      {t("surprise.none")}
                    </p>
                    <button onClick={clearFilters} className="btn-pill btn-primary px-6 py-3 text-sm">
                      {t("surprise.clearFilters")}
                    </button>
                  </div>
                )}

                {phase === "result" && card && (
                  <div className={`transition duration-300 motion-reduce:transition-none ${revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                    <div className="relative overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.image || FALLBACK_IMAGE}
                        alt={card.name}
                        className="aspect-[2/1] w-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE
                        }}
                      />
                      {isOpenNow !== null && (
                        <span
                          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${isOpenNow ? "bg-open text-black" : "bg-black/70 text-zinc-100"}`}
                        >
                          {isOpenNow ? t("surprise.openNowShort") : t("surprise.closedNow")}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 line-clamp-2 font-display text-xl leading-tight text-white">{card.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {card.neighborhood || "Barcelona"}
                      {dist !== null && ` · ${t("surprise.walkDist").replace("{d}", formatDistance(dist)).replace("{n}", String(walkingMinutes(dist)))}`}
                    </p>

                    {facts.length > 0 && (
                      <ul className="mt-4 space-y-2.5" aria-label={t("surprise.reasonsTitle")}>
                        {facts.map(({ key, Icon, text, sub, tone }) => (
                          <li key={key} className="flex items-start gap-3">
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#23202d] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
                              <Icon size={14} aria-hidden="true" className={tone === "good" ? "text-open" : "text-zinc-300"} />
                            </span>
                            <span className="min-w-0 flex-1 pt-0.5">
                              <span className={`block text-[15px] font-semibold leading-snug ${tone === "good" ? "text-white" : "text-zinc-100"}`}>{text}</span>
                              {sub && <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-zinc-400">{sub}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {tags.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {tags.map(({ key, text, strong }) => (
                          <li
                            key={key}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${strong ? on : "bg-[#23202d] text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"}`}
                          >
                            {text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {note && <p className="mt-4 text-xs font-semibold text-warn">{t(NOTE_KEY[note])}</p>}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {directions ? (
                        <a
                          href={directions}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-pill btn-secondary inline-flex items-center justify-center px-3 py-3 text-center text-sm"
                        >
                          {t("surprise.directions")}
                        </a>
                      ) : (
                        <span />
                      )}
                      <SharePlanButton
                        label={t("surprise.shareShort")}
                        className="btn-pill btn-secondary px-3 py-3 text-sm disabled:opacity-60"
                        title={`${t("surprise.planTitle")} · ${card.name}`}
                        stops={[
                          {
                            kind: "club",
                            title: card.name,
                            subtitle: [card.neighborhood, card.music].filter(Boolean).join(" · "),
                            image: card.image,
                            href,
                          },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de abajo: volver, otra opción, ver ficha */}
              {phase === "result" && card && (
                <div className="flex gap-2 border-t border-white/5 bg-zinc-950 px-5 pb-5 pt-3">
                  {trail.at > 0 && (
                    <button
                      onClick={back}
                      aria-label={t("surprise.previous")}
                      className="btn-pill btn-secondary grid h-12 w-12 shrink-0 place-items-center"
                    >
                      <ChevronLeft size={20} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    onClick={() => draw()}
                    className="btn-pill btn-secondary flex h-12 flex-1 items-center justify-center gap-2 px-3 text-sm active:scale-95 motion-reduce:transition-none"
                  >
                    <Dices size={17} aria-hidden="true" /> {t("surprise.another")}
                  </button>
                  <Link href={href} onClick={() => setOpen(false)} className="btn-pill btn-primary flex h-12 flex-1 items-center justify-center px-3 text-center text-sm">
                    {t("surprise.seeVenue")}
                  </Link>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
