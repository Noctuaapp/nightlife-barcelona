"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { ChevronLeft, Clock, Dices, Flame, Footprints, Heart, MapPin, Music2, Navigation, Sparkles, Ticket, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import SharePlanButton from "../plan/SharePlanButton"
import NocSays, { useOwnLevelColor } from "../mascot/NocSays"
import { useLanguage } from "../../context/LanguageContext"
import { getDeniedClubIds } from "../../lib/deniedVenues"
import { effectiveHoursStatus, effectiveOpenNow } from "../../lib/scheduleNotices"
import { createSlug } from "../../lib/slug"
import { zonesPresent } from "../../lib/zones"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { formatDistance, walkingDirectionsUrl, walkingMinutes } from "../../lib/geo"
import { clubDistance, hasFreeEntry, MOOD_IDS, NO_EXTRAS, pickSurprise, type Extras, type Mood, type SurpriseNote } from "../../lib/surprise"

// «Sorpréndeme» (rediseñado el 31/10/2026). Un toque abre la hoja, eliges el rollo (y, si quieres,
// zona, extras y «cerca de mí»), un dado con suspense y te propone UN sitio con las razones
// (abierto hasta cuándo, a cuánto está, música, entrada…) y todo lo necesario para ir: ficha,
// cómo llegar y proponérselo a los amigos. «Otra opción» no repite; «Anterior» vuelve atrás.
// La lógica de elección está en lib/surprise.ts (con tests).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>

const MOOD_EMOJI: Record<Mood, string> = { any: "✨", dance: "💃", chat: "🗣️", chill: "🌙", live: "🎸" }
const MOOD_KEY: Record<Mood, string> = {
  any: "surprise.moodAny",
  dance: "surprise.moodDance",
  chat: "surprise.moodChat",
  chill: "surprise.moodChill",
  live: "surprise.moodLive",
}
const NOTE_KEY: Record<Exclude<SurpriseNote, "">, string> = {
  extras: "surprise.tierExtras",
  otherOpen: "surprise.tierOtherOpen",
  later: "surprise.tierLater",
}
const VIBE_KEY: Record<string, string> = { tranquilo: "clubPage.vibeQuiet", animado: "clubPage.vibeBusy", lleno: "clubPage.vibeFull" }
const LIVE_STATUS_MAX_AGE_MS = 4 * 60 * 60 * 1000
const PREFS_KEY = "noctua_surprise_v1"

// Pausas (ms) entre cambios del «dado»: empieza rápido y frena hasta quedarse en el elegido.
const SPIN_DELAYS = [70, 70, 70, 80, 90, 105, 125, 150, 185, 230, 290]

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Reason = { key: string; Icon: LucideIcon; text: string; tone?: "good" }

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

export default function SurpriseMe({ clubs }: { clubs: Club[] }) {
  const { t } = useLanguage()
  const levelColor = useOwnLevelColor()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<"form" | "spin" | "result">("form")
  const [mood, setMood] = useState<Mood>("any")
  const [extras, setExtras] = useState<Extras>(NO_EXTRAS)
  const [zone, setZone] = useState("")
  const [near, setNear] = useState(false)
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState("")
  const [denied, setDenied] = useState<Set<number>>(() => new Set())
  const [reel, setReel] = useState<Club | null>(null)
  const [trail, setTrail] = useState<{ items: Club[]; at: number }>({ items: [], at: -1 })
  const [seen, setSeen] = useState<number[]>([])
  const [note, setNote] = useState<SurpriseNote>("")
  const [none, setNone] = useState(false)
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

  // El foco entra en la hoja al abrirla y vuelve a ella cuando cambia de fase (si no, al desaparecer
  // el botón pulsado el foco se pierde y quien navega con teclado o lector se queda sin sitio).
  useEffect(() => {
    if (open) dialogRef.current?.focus()
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

  const toggleNear = () => {
    if (locating) return
    if (near) {
      setNear(false)
      return
    }
    setGeoError("")
    if (pos) {
      setNear(true)
      return
    }
    if (!navigator.geolocation) {
      setGeoError(t("surprise.geoUnsupported"))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude })
        setNear(true)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setGeoError(err.code === 1 ? t("surprise.geoBlocked") : t("surprise.geoFailed"))
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    )
  }

  const draw = () => {
    const res = pickSurprise({ clubs, mood, extras, zone, near, pos, denied, seen })
    if (!res) {
      setNone(true)
      setPhase("form")
      return
    }
    setNone(false)
    clearSpin()
    const chosen = res.club
    const finish = () => {
      setReel(chosen)
      setNote(res.note)
      setSeen((s) => [...s, chosen.id])
      setTrail((tr) => ({ items: [...tr.items.slice(0, tr.at + 1), chosen], at: tr.at + 1 }))
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
    setPhase("spin")
    // Los que «pasan» por el dado: al azar entre los posibles, sin repetir seguidos.
    let last: Club | null = null
    let at = 0
    SPIN_DELAYS.forEach((d) => {
      at += d
      timers.current.push(
        setTimeout(() => {
          const options = res.candidates.filter((c) => c !== last && c !== chosen)
          const next = options.length ? options[Math.floor(Math.random() * options.length)] : chosen
          last = next
          setReel(next)
        }, at)
      )
    })
    timers.current.push(setTimeout(finish, at + 330))
  }

  const close = () => {
    clearSpin()
    setOpen(false)
    setPhase("form")
    setReel(null)
    setTrail({ items: [], at: -1 })
    setSeen([])
    setNote("")
    setNone(false)
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

  const card: Club | null = phase === "result" ? trail.items[trail.at] || null : reel
  const dist = card ? clubDistance(card, pos) : null
  const isOpenNow = card ? effectiveOpenNow(card) : null

  const reasons = useMemo<Reason[]>(() => {
    if (!card || phase !== "result") return []
    const out: Reason[] = []
    const status = effectiveHoursStatus(card)
    if (status?.open) out.push({ key: "hours", Icon: Clock, text: t("surprise.openUntil").replace("{t}", status.at), tone: "good" })
    else if (status) out.push({ key: "hours", Icon: Clock, text: t("surprise.opensAt").replace("{t}", status.at) })
    if (dist !== null) {
      out.push({ key: "walk", Icon: Footprints, text: t("surprise.walkDist").replace("{d}", formatDistance(dist)).replace("{n}", String(walkingMinutes(dist))) })
    }
    if (card.music) out.push({ key: "music", Icon: Music2, text: String(card.music) })
    if (hasFreeEntry(card)) out.push({ key: "free", Icon: Ticket, text: t("surprise.extraFree"), tone: "good" })
    else if (card.price) out.push({ key: "price", Icon: Ticket, text: t("surprise.price").replace("{p}", String(card.price)) })
    if (card.age_min) out.push({ key: "age", Icon: Ticket, text: t("surprise.minAge").replace("{n}", String(card.age_min)) })
    const vibeKey = card.live_status && VIBE_KEY[card.live_status]
    const fresh = card.live_status_updated_at && Date.now() - new Date(card.live_status_updated_at).getTime() < LIVE_STATUS_MAX_AGE_MS
    if (vibeKey && fresh) out.push({ key: "vibe", Icon: Flame, text: t("surprise.vibe").replace("{v}", t(vibeKey)) })
    if (card.terrace) out.push({ key: "terrace", Icon: Sparkles, text: t("surprise.extraTerrace") })
    if (card.lgtbi_friendly) out.push({ key: "lgtbi", Icon: Heart, text: t("surprise.extraLgtbi") })
    if (card.dance_floor) out.push({ key: "dance", Icon: Sparkles, text: t("surprise.reasonDance") })
    if (card.live_music) out.push({ key: "live", Icon: Music2, text: t("surprise.reasonLive") })
    if (card.cocktails) out.push({ key: "cocktails", Icon: Sparkles, text: t("surprise.reasonCocktails") })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, phase, dist, t])

  const zones = useMemo(() => zonesPresent(clubs), [clubs])
  const href = card ? `/clubs/${card.slug || createSlug(card.name)}` : "#"
  const directions = card ? directionsUrl(card, pos) : null
  const toggleExtra = (k: keyof Extras) => setExtras((e) => ({ ...e, [k]: !e[k] }))

  const chip = (on: boolean) =>
    `rounded-full px-4 py-2.5 text-sm font-bold transition ${on ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`

  const announce =
    phase === "spin" ? t("surprise.thinking") : phase === "result" && card ? t("surprise.announce").replace("{name}", card.name) : ""

  return (
    <>
      <div className="flex flex-col gap-4 rounded-card border border-brand/30 bg-gradient-to-br from-brand/20 via-night/70 to-night/80 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <NocSays />
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-center">
          <button
            ref={triggerRef}
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-ctl bg-white px-6 py-4 text-sm font-black text-black transition hover:scale-[1.03] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
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
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
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
              className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-6 outline-none sm:rounded-3xl"
            >
              <p role="status" aria-live="polite" className="sr-only">
                {announce}
              </p>
              <button
                onClick={close}
                aria-label={t("surprise.close")}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              >
                <X size={18} aria-hidden="true" />
              </button>

              {phase === "form" && (
                <>
                  <div className="flex items-center gap-3 pr-10">
                    <NocOwl size={56} mood="wink" levelColor={levelColor} />
                    <div>
                      <h2 className="text-xl font-black text-white">{t("surprise.question")}</h2>
                      <p className="text-sm text-zinc-400">{t("surprise.sub")}</p>
                    </div>
                  </div>

                  <div role="radiogroup" aria-label={t("surprise.question")} className="mt-5 flex flex-wrap gap-2">
                    {MOOD_IDS.map((id) => (
                      <button key={id} role="radio" aria-checked={mood === id} onClick={() => setMood(id)} className={chip(mood === id)}>
                        <span aria-hidden="true">{MOOD_EMOJI[id]}</span> {t(MOOD_KEY[id])}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold text-zinc-400">{t("surprise.extrasLabel")}</p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ["free", "surprise.extraFree"],
                        ["terrace", "surprise.extraTerrace"],
                        ["lgtbi", "surprise.extraLgtbi"],
                      ] as const).map(([k, label]) => (
                        <button key={k} aria-pressed={extras[k]} onClick={() => toggleExtra(k)} className={`${chip(extras[k])} !py-2 !text-xs`}>
                          {t(label)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {zones.length > 1 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold text-zinc-400">{t("surprise.zoneLabel")}</p>
                      <div className="scrollbar-none -mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
                        {["", ...zones].map((z) => (
                          <button key={z || "all"} aria-pressed={zone === z} onClick={() => setZone(z)} className={`shrink-0 ${chip(zone === z)} !py-2 !text-xs`}>
                            {z === "" ? t("surprise.allArea") : z.replace(" de Llobregat", "").replace(" de Besòs", "").replace(" de Gramenet", "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={toggleNear}
                    aria-pressed={near}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-ctl px-4 py-3 text-sm font-bold transition ${
                      near ? "bg-brand text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    <MapPin size={16} aria-hidden="true" /> {locating ? t("surprise.locating") : near ? t("surprise.nearOn") : t("surprise.nearOff")}
                  </button>
                  {geoError && (
                    <p role="alert" className="mt-2 text-xs text-warn">
                      {geoError}
                    </p>
                  )}
                  {none && (
                    <p role="alert" className="mt-3 text-sm font-semibold text-warn">
                      {t("surprise.none")}
                    </p>
                  )}

                  <div className="sticky bottom-0 -mx-6 -mb-6 mt-5 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent px-6 pb-6 pt-4">
                    <button
                      onClick={draw}
                      className="flex w-full items-center justify-center gap-2 rounded-ctl bg-brand px-6 py-4 text-base font-black text-white transition hover:bg-brand-strong active:scale-95 motion-reduce:transition-none"
                    >
                      <Dices size={20} aria-hidden="true" /> {t("surprise.go")}
                    </button>
                  </div>
                </>
              )}

              {phase !== "form" && card && (
                <div className="-mx-6 -mt-6 sm:mx-0 sm:mt-0">
                  <div className="relative h-64 overflow-hidden sm:rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image || FALLBACK_IMAGE}
                      alt={phase === "result" ? card.name : ""}
                      className={`h-full w-full object-cover transition duration-300 motion-reduce:transition-none ${phase === "spin" ? "scale-105 blur-[2px]" : ""}`}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/40 to-black/10" />
                    {phase === "result" && isOpenNow !== null && (
                      <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold ${isOpenNow ? "bg-open text-black" : "bg-black/60 text-zinc-100 backdrop-blur"}`}>
                        {isOpenNow ? t("surprise.openNowShort") : t("surprise.closedNow")}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-5" aria-hidden={phase === "spin"}>
                      <p className="text-xs font-semibold text-zinc-300">
                        {phase === "result" ? t("surprise.intro") : card.neighborhood || "Barcelona"}
                      </p>
                      <h2 className="mt-0.5 text-3xl font-black leading-tight text-white">{card.name}</h2>
                      {phase === "result" && <p className="mt-0.5 text-sm text-zinc-300">{card.neighborhood || "Barcelona"}</p>}
                    </div>
                  </div>

                  {phase === "spin" && (
                    <div className="flex items-center justify-center gap-3 px-6 py-5">
                      <NocOwl size={40} mood="wow" levelColor={levelColor} />
                      <p className="text-sm font-bold text-zinc-300">{t("surprise.thinking")}</p>
                    </div>
                  )}

                  {phase === "result" && (
                    <div className={`px-6 pb-6 pt-4 transition duration-300 motion-reduce:transition-none sm:px-0 ${revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                      {reasons.length > 0 && (
                        <ul className="flex flex-wrap gap-2" aria-label={t("surprise.reasonsTitle")}>
                          {reasons.map(({ key, Icon, text, tone }) => (
                            <li
                              key={key}
                              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                tone === "good" ? "border-open/40 bg-open/10 text-open" : "border-white/10 bg-white/5 text-zinc-200"
                              }`}
                            >
                              <Icon size={13} aria-hidden="true" className="shrink-0" />
                              <span className="truncate">{text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {hasFreeEntry(card) && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">{card.free_entry_info}</p>}
                      {note && <p className="mt-3 text-xs font-semibold text-warn">{t(NOTE_KEY[note])}</p>}

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <Link href={href} onClick={() => setOpen(false)} className="rounded-ctl bg-white px-4 py-3 text-center text-sm font-black text-black transition hover:bg-zinc-200">
                          {t("surprise.seeVenue")}
                        </Link>
                        {directions ? (
                          <a
                            href={directions}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-ctl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            <Navigation size={15} aria-hidden="true" /> {t("surprise.directions")}
                          </a>
                        ) : (
                          <span />
                        )}
                        <SharePlanButton
                          label={t("surprise.proposeFriends")}
                          className="col-span-2 rounded-ctl border border-brand/40 bg-brand/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand/20 disabled:opacity-60"
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

                      <div className="mt-2 flex gap-2">
                        {trail.at > 0 && (
                          <button
                            onClick={back}
                            className="inline-flex items-center justify-center gap-1 rounded-ctl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                          >
                            <ChevronLeft size={16} aria-hidden="true" /> {t("surprise.previous")}
                          </button>
                        )}
                        <button
                          onClick={draw}
                          className="flex flex-1 items-center justify-center gap-2 rounded-ctl bg-brand px-4 py-3 text-sm font-black text-white transition hover:bg-brand-strong active:scale-95 motion-reduce:transition-none"
                        >
                          <Dices size={17} aria-hidden="true" /> {t("surprise.another")}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          clearSpin()
                          setPhase("form")
                        }}
                        className="mx-auto mt-4 block text-xs font-semibold text-zinc-400 underline underline-offset-2 transition hover:text-white"
                      >
                        {t("surprise.changeFilters")}
                      </button>
                    </div>
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
