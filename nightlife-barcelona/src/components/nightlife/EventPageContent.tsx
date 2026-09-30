"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import FavoriteButton from "../favorites/FavoriteButton"
import AttendanceButton from "../gamification/AttendanceButton"
import NearbyVenuesSheet from "../nightlife/NearbyVenuesSheet"
import ClubMap from "../map/ClubMap"
import EventSessionsCalendar from "../nightlife/EventSessionsCalendar"
import TransportButtons from "../ui/TransportButtons"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"

// Un evento de varios días (date_end) no se considera terminado hasta que pasa el último día,
// no el primero.
const isEventPast = (date: string, dateEnd?: string | null): boolean => {
  if (!date) return false
  const eventDate = new Date(dateEnd || date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return eventDate < now
}

const ACCENT_PALETTE = [
  { from: "#8b5cf6", to: "#ec4899", glow: "139,92,246" },
  { from: "#f43f5e", to: "#fb923c", glow: "244,63,94" },
  { from: "#06b6d4", to: "#6366f1", glow: "6,182,212" },
  { from: "#10b981", to: "#a3e635", glow: "16,185,129" },
  { from: "#f59e0b", to: "#ef4444", glow: "245,158,11" },
  { from: "#d946ef", to: "#6366f1", glow: "217,70,239" },
]

const hashAccent = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length]
}

function Icon({ name, className = "h-5 w-5", style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const p = { className, style, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (name) {
    case "music": return <svg {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
    case "ticket": return <svg {...p}><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" /></svg>
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
    case "calendar": return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
    case "map": return <svg {...p}><path d="M9 20l-6-2V6l6 2 6-2 6 2v12l-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
    case "share": return <svg {...p}><circle cx="6" cy="12" r="2.3" /><circle cx="18" cy="6" r="2.3" /><circle cx="18" cy="18" r="2.3" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg>
    case "flag": return <svg {...p}><path d="M5 3v18M5 4h13l-3 4 3 4H5" /></svg>
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case "flame": return <svg {...p}><path d="M12 3c1 3-2 4-2 7a4 4 0 108 0c0-1-1-2-1-2 1 4-1 5-1 5 2-1 3-4 3-6 0-5-4-6-4-9-1 2-3 3-3 5z" /></svg>
    case "ban": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></svg>
    case "back": return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    case "close": return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case "sofa": return <svg {...p}><path d="M4 12v5a1 1 0 001 1h1v2M18 18h1a1 1 0 001-1v-5M4 12a2 2 0 012-2h12a2 2 0 012 2M4 12v3h16v-3M17 18v2" /></svg>
    case "headphones": return <svg {...p}><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="2" y="14" width="5" height="7" rx="2" /><rect x="17" y="14" width="5" height="7" rx="2" /></svg>
    case "star": return <svg {...p} fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17.8l-6.1 3.4 1.5-6.9-5.2-4.7 6.9-.7z" /></svg>
    case "google": return <svg {...p} fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M21.6 12.23c0-.68-.06-1.36-.18-2H12v3.8h5.4a4.62 4.62 0 01-2 3.03v2.5h3.24c1.9-1.75 3-4.33 3-7.33z" /><path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.24-2.5c-.9.6-2.06.96-3.4.96-2.6 0-4.8-1.76-5.6-4.13H3.05v2.6A10 10 0 0012 22z" /><path d="M6.4 13.9a6 6 0 010-3.8v-2.6H3.05a10 10 0 000 9l3.35-2.6z" /><path d="M12 5.98c1.47 0 2.8.5 3.83 1.5l2.87-2.87A9.7 9.7 0 0012 2a10 10 0 00-8.95 5.5l3.35 2.6c.8-2.37 3-4.12 5.6-4.12z" /></svg>
    default: return null
  }
}

function CountUp({ value, duration = 1400, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let startTs: number | null = null
    let raf = 0
    const step = (ts: number) => {
      if (startTs === null) startTs = ts
      const progress = Math.min((ts - startTs) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(eased * value)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.floor(display)}</>
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}
    >
      {children}
    </div>
  )
}

function Card({
  className = "",
  innerClassName = "p-7",
  children,
  as: As = "div",
  onClick,
}: {
  className?: string
  innerClassName?: string
  children?: React.ReactNode
  as?: "div" | "button"
  onClick?: () => void
}) {
  return (
    <As
      onClick={onClick}
      className={`rounded-[28px] bg-gradient-to-br from-white/20 via-white/[0.06] to-white/0 p-[1px] transition duration-300 hover:from-white/35 ${className}`}
    >
      <div className={`h-full w-full rounded-[27px] bg-[#0b0912]/95 backdrop-blur-2xl ${innerClassName}`}>{children}</div>
    </As>
  )
}

function Stars({ rating, size = "h-3.5 w-3.5", color }: { rating: number; size?: string; color: string }) {
  const rounded = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" className={`${size} ${n <= rounded ? "" : "opacity-20"}`} style={{ color }} />
      ))}
    </div>
  )
}

export default function EventPageContent({ event, tickets, sessions }: { event: any; tickets: any[]; sessions: any[] }) {
  const { t, locale } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [spot, setSpot] = useState({ x: 50, y: 30 })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [mounted, setMounted] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const heroRef = useRef<HTMLDivElement>(null)

  const accent = hashAccent(event.music || event.title || "noctua")
  const past = isEventPast(event.date, event.date_end)
  const firstOpenTicket = (tickets || []).find((tk) => tk.external_url)
  const ticketUrl = !past && !event.sold_out ? firstOpenTicket?.external_url || event.ticket_url : null
  const displayRating = event.google_rating || null
  const reviewCount = event.google_review_count || null
  const venue = event.club_name || event.address || "Barcelona"

  useEffect(() => {
    const idm = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(idm)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setPastHero(window.scrollY > (heroRef.current?.offsetHeight || 560) - 120)
      setScrollY(window.scrollY)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const loadReviews = async () => {
      const { data } = await supabase
        .from("event_reviews")
        .select("*")
        .eq("event_id", event.id)
        .order("rating", { ascending: false })
      if (data) setReviews(data)
    }
    loadReviews()
  }, [event.id])

  const trackClick = async (eventType: string) => {
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from("analytics").insert({
      event_type: eventType,
      item_type: "event",
      item_id: event.id,
      item_name: event.title,
      user_id: userData.user?.id || null,
    })
  }

  // Registra la visita a esta ficha (solo si el usuario ha iniciado sesión) para poder mostrar
  // "últimos eventos visitados" en su perfil.
  useEffect(() => {
    trackClick("page_view")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  const shareEvent = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: event.title, text: `${t("event.shareTextPrefix")} ${event.title} ${t("event.shareTextSuffix")}`, url })
      } catch {}
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      window.alert(t("event.linkCopied"))
    }
  }

  const openDirections = () => {
    trackClick("directions_click")
    if (event.latitude && event.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`, "_blank")
    } else if (event.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address + " " + (event.title || ""))}`, "_blank")
    }
  }

  const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const countdown = (() => {
    if (past || !event.date) return null
    const target = new Date(event.date)
    if (event.start_time) {
      const [h, m] = event.start_time.split(":").map((n: string) => parseInt(n, 10))
      if (!isNaN(h)) target.setHours(h, m || 0, 0, 0)
    }
    const diff = target.getTime() - now
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return { days, hours, mins }
  })()

  const dateLabel = event.date
    ? new Date(event.date).toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : t("clubEvent.tba")

  // Si tiene date_end distinto de date, es un evento de varios días -> se muestra como rango.
  const dateEndLabel =
    event.date_end && event.date_end !== event.date
      ? new Date(event.date_end).toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : null
  const fullDateLabel = dateEndLabel ? `${dateLabel} - ${dateEndLabel}` : dateLabel

  const priceTiers: { label: string; price: string }[] = Array.isArray(event.price_tiers) ? event.price_tiers : []

  const galleryImages: string[] = (Array.isArray(event.gallery) ? event.gallery : []).filter(
    (src: any) => typeof src === "string" && src.length > 0
  )
  const allImages = [event.image, ...galleryImages].filter(Boolean)

  const quickFacts = [
    { key: "date", icon: "calendar", value: past ? t("event.finishedValue") : dateEndLabel ? `${dateLabel.split(",")[0]} - ${dateEndLabel.split(",")[0]}` : dateLabel.split(",")[0] || dateLabel, label: t("event.date") },
    { key: "time", icon: "clock", value: event.start_time ? `${event.start_time}${event.end_time ? ` - ${event.end_time}` : ""}` : t("clubEvent.tba"), label: t("event.schedule") },
    { key: "price", icon: "ticket", value: event.price || t("clubEvent.tba"), label: t("event.price") },
    { key: "music", icon: "music", value: event.music || t("clubEvent.tba"), label: t("club.music") },
    { key: "venue", icon: "map", value: venue, label: t("event.venue") },
  ]

  const accentGradient = { background: `linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)` }

  return (
    <main className="min-h-screen bg-[#050308] text-white">
      {/* HEADER */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-3.5 transition-all duration-300 sm:px-6 ${
          scrolled ? "border-b border-white/10 bg-[#050308]/90 backdrop-blur-2xl" : "bg-gradient-to-b from-black/60 to-transparent"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/events"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-xl transition hover:bg-white/10"
          >
            <Icon name="back" className="h-4.5 w-4.5" />
          </Link>
          <div
            className={`min-w-0 items-center gap-2 transition-all duration-300 ${
              pastHero ? "flex opacity-100 translate-x-0" : "hidden opacity-0 -translate-x-2 sm:flex sm:pointer-events-none"
            }`}
            style={{ opacity: pastHero ? 1 : 0 }}
          >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
              <img src={event.image || FALLBACK_IMAGE} alt={event.title} className="h-full w-full object-cover" />
            </div>
            <p className="truncate text-sm font-black text-white">{event.title}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={shareEvent}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-xl transition hover:bg-white/10 sm:flex"
          >
            <Icon name="share" className="h-4 w-4" />
          </button>
          {event.latitude && event.longitude && (
            <button
              onClick={openDirections}
              className="rounded-full bg-white px-4 py-2.5 text-xs font-black text-black transition hover:scale-105 sm:px-5 sm:text-sm"
            >
              {t("event.directions")}
            </button>
          )}
        </div>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="relative flex h-[80vh] min-h-[560px] items-end overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Antes era un <img> normal: sin conversión a WebP/AVIF, sin tamaños responsive y sin
              indicarle al navegador que es el elemento más importante de la página (LCP). Con
              next/image y priority, el navegador la prioriza sobre cualquier otra imagen/script
              y recibe una versión ya optimizada para su pantalla. unoptimized solo se activa para
              el SVG de respaldo en línea (data:), que no tiene sentido pasar por el optimizador. */}
          <Image
            src={event.image || FALLBACK_IMAGE}
            alt={event.title}
            fill
            priority
            sizes="100vw"
            unoptimized={!event.image}
            style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.12)` }}
            className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out will-change-transform"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050308] via-black/45 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/30" />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.6)" }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-70 mix-blend-soft-light transition-[background] duration-300"
          style={{
            background: `radial-gradient(650px circle at ${spot.x}% ${spot.y}%, rgba(${accent.glow},0.35), transparent 60%)`,
          }}
        />

        <div className="relative z-10 w-full px-5 pb-10 sm:px-8 md:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className={`flex flex-wrap items-center gap-2 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              {past && (
                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-[11px] font-bold text-zinc-300 backdrop-blur-xl">
                  {t("event.finished")}
                </span>
              )}
              {event.featured && !past && (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-[11px] font-bold text-amber-300 backdrop-blur-xl">
                  <Icon name="star" className="h-3 w-3" /> {t("event.featured")}
                </span>
              )}
              {event.sold_out && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3.5 py-1.5 text-[11px] font-bold text-red-300 backdrop-blur-xl">
                  <Icon name="ban" className="h-3 w-3" /> {t("event.soldOut")}
                </span>
              )}
              {event.vip_tables && !past && (
                <span className="flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-3.5 py-1.5 text-[11px] font-bold text-purple-300 backdrop-blur-xl">
                  <Icon name="sofa" className="h-3 w-3" /> {t("event.vipTable")}
                </span>
              )}
            </div>

            <div style={{ transitionDelay: "100ms" }} className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.4em]" style={{ color: accent.from }}>
                {event.music || "Barcelona"}
              </p>
              <h1 className="mt-3 text-[11vw] font-black leading-[0.9] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5rem]">
                {event.title}
              </h1>
            </div>

            <div style={{ transitionDelay: "180ms" }} className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                <Icon name="map" className="h-3.5 w-3.5 text-zinc-500" /> {venue}
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                <Icon name="calendar" className="h-3.5 w-3.5 text-zinc-500" /> {fullDateLabel}
              </span>
              {displayRating && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-600" />
                  <span className="flex items-center gap-2">
                    <Stars rating={displayRating} color={accent.from} />
                    <span className="text-sm font-bold text-white"><CountUp value={displayRating} decimals={1} /></span>
                    {reviewCount && <span className="text-sm text-zinc-500">({reviewCount} {t("event.reviewsOfGoogle")})</span>}
                  </span>
                </>
              )}
            </div>

            <div style={{ transitionDelay: "260ms" }} className={`mt-8 flex flex-wrap items-center gap-3 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              {ticketUrl && (
                <a
                  href={ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("tickets_click")}
                  style={accentGradient}
                  className="flex items-center gap-2 rounded-2xl px-7 py-4 font-black text-white transition hover:scale-[1.02] hover:opacity-90"
                >
                  <Icon name="ticket" className="h-4 w-4" /> {t("event.buyTickets")}
                </a>
              )}
              {event.latitude && event.longitude && (
                <button
                  onClick={openDirections}
                  className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white backdrop-blur-xl transition hover:bg-white/10"
                >
                  <Icon name="map" className="h-4 w-4" /> {t("event.directions")}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK FACTS STRIP */}
      <Reveal className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <Card innerClassName="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
          {quickFacts.map((f) => (
            <div key={f.key} className="flex items-center gap-3 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10" style={{ color: accent.from }}>
                <Icon name={f.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold text-white ${
                    f.key === "date" || f.key === "time" ? "whitespace-normal break-words leading-snug" : "truncate"
                  }`}
                  title={f.key === "date" || f.key === "time" ? String(f.value) : undefined}
                >
                  {f.value}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">{f.label}</p>
              </div>
            </div>
          ))}
        </Card>
      </Reveal>

      {/* COUNTDOWN */}
      {countdown && (
        <Reveal className="relative z-10 mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <div
            style={{ background: `linear-gradient(110deg, rgba(${accent.glow},0.28), rgba(${accent.glow},0.06))` }}
            className="flex w-full flex-col items-stretch gap-5 overflow-hidden rounded-[28px] border border-white/10 p-6 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent.from }}>{t("event.startsIn")}</p>
              <p className="mt-2 truncate text-xl font-black text-white md:text-2xl">{event.title}</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              {[
                { v: countdown.days, l: t("event.days") },
                { v: countdown.hours, l: t("event.hours") },
                { v: countdown.mins, l: t("event.minutes") },
              ].map((u) => (
                <div key={u.l} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center">
                  <p className="text-2xl font-black text-white tabular-nums">{u.v}</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400">{u.l}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* GALERIA */}
      {allImages.length > 1 && (
        <Reveal className="mt-16">
          <p className="mx-auto max-w-6xl px-4 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-5 sm:px-6">{t("event.gallery")}</p>
          <div className="mx-auto hidden max-w-6xl grid-cols-4 grid-rows-2 gap-3 px-6 sm:grid" style={{ height: 420 }}>
            {allImages.slice(0, 5).map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"}`}
              >
                {/* La primera foto del mosaico (col-span-2 row-span-2) es probablemente el LCP de la
                    página, por eso lleva priority; el resto se cargan de forma perezosa. */}
                <Image
                  src={src}
                  alt={`${event.title} ${i + 1}`}
                  fill
                  sizes={i === 0 ? "(max-width: 640px) 0px, 50vw" : "(max-width: 640px) 0px, 25vw"}
                  priority={i === 0}
                  className="object-cover transition duration-700 group-hover:scale-110"
                />
                {i === 4 && allImages.length > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-black text-white">
                    +{allImages.length - 5}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:hidden">
            {allImages.map((src: string, i: number) => (
              <button key={i} onClick={() => setLightboxIndex(i)} className="group relative h-[60vw] w-[78vw] shrink-0 snap-center overflow-hidden rounded-[28px]">
                <Image src={src} alt={`${event.title} ${i + 1}`} fill sizes="78vw" className="object-cover" />
              </button>
            ))}
          </div>
        </Reveal>
      )}

      {lightboxIndex !== null && (
        <div onClick={() => setLightboxIndex(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-xl">
          <button onClick={() => setLightboxIndex(null)} className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
            <Icon name="close" className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + allImages.length) % allImages.length) }}
            className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white sm:left-8"
          >
            <Icon name="arrow" className="h-5 w-5 rotate-180" />
          </button>
          <img src={allImages[lightboxIndex]} alt={event.title} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % allImages.length) }}
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white sm:right-8"
          >
            <Icon name="arrow" className="h-5 w-5" />
          </button>
        </div>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-8 lg:col-span-2">
            <Reveal>
              <Card innerClassName="p-8">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t("event.about")}</p>
                <p className="mt-4 text-lg leading-relaxed text-zinc-200 first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8] first-letter:text-white">
                  {event.description || `${event.title} ${t("event.defaultDescriptionSuffix")}`}
                </p>
                {event.artist && (
                  <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10" style={{ color: accent.from }}>
                      <Icon name="headphones" className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{t("event.artist")}</p>
                      <p className="text-sm font-bold text-white">{event.artist}</p>
                    </div>
                  </div>
                )}
              </Card>
            </Reveal>

            {sessions && sessions.length > 0 && (
              <Reveal>
                <Card innerClassName="p-8">
                  <EventSessionsCalendar sessions={sessions} eventName={event.title} />
                </Card>
              </Reveal>
            )}

            {reviews.length > 0 && (
              <Reveal>
                <Card innerClassName="p-8">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                      <p className="text-4xl font-black text-white">{Number(displayRating).toFixed(1)}</p>
                      <div>
                        <Stars rating={displayRating || 0} size="h-4 w-4" color={accent.from} />
                        <p className="mt-1 text-xs text-zinc-500">{reviewCount ? `${reviewCount} ${t("event.reviews")}` : `${reviews.length} ${t("event.reviews")}`}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <Icon name="google" className="h-3.5 w-3.5" /> {t("event.googleReviewsLabel")}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {reviews.slice(0, 4).map((r) => (
                      <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{r.author_name}</p>
                          {r.rating && <Stars rating={r.rating} color={accent.from} />}
                        </div>
                        {r.relative_time && <p className="mt-0.5 text-[11px] text-zinc-500">{r.relative_time}</p>}
                        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-zinc-400">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>
            )}

            {event.latitude && event.longitude && (
              <Reveal>
                <Card innerClassName="p-8">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-4">{t("event.location")}</p>
                  <div className="overflow-hidden rounded-2xl">
                    <ClubMap latitude={event.latitude} longitude={event.longitude} name={event.title} />
                  </div>
                  {event.address && <p className="mt-4 text-sm text-zinc-400">{event.address}</p>}
                  <button
                    onClick={openDirections}
                    style={accentGradient}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white transition hover:scale-[1.01]"
                  >
                    <Icon name="map" className="h-4 w-4" /> {t("event.openRouteGoogleMaps")}
                  </button>
                  <div className="mt-6">
                    <TransportButtons name={event.title} address={event.address} lat={event.latitude} lng={event.longitude} />
                  </div>
                </Card>
              </Reveal>
            )}
          </div>

          {/* RIGHT — SIDEBAR */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <Card innerClassName="">
              <div className="flex items-center gap-4 border-b border-white/10 p-6">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                  <img src={event.image || FALLBACK_IMAGE} alt={event.title} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">{event.title}</p>
                  <p className="truncate text-sm text-zinc-500">{venue}</p>
                  {displayRating && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Stars rating={displayRating} color={accent.from} />
                      <span className="text-xs font-bold text-zinc-300">{Number(displayRating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 border-b border-white/10 p-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">{t("event.date")}</span>
                  <span className="text-right font-semibold text-white">{fullDateLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">{t("event.time")}</span>
                  <span className="font-semibold text-white">{event.start_time || t("clubEvent.tba")}{event.end_time ? ` - ${event.end_time}` : ""}</span>
                </div>
                {priceTiers.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {priceTiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-zinc-500">{tier.label}</span>
                        <span className="font-semibold text-white">{tier.price}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{t("event.price")}</span>
                    <span className="font-semibold text-white">{event.price || t("clubEvent.tba")}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-6">
                {tickets && tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">{ticket.name}</p>
                            {ticket.description && <p className="mt-1 text-xs text-zinc-500">{ticket.description}</p>}
                          </div>
                          <p className="shrink-0 font-black text-white">{ticket.price ? `${ticket.price} ${ticket.currency || "EUR"}` : t("clubEvent.tba")}</p>
                        </div>
                        {ticket.external_url && !event.sold_out && !past && (
                          <a
                            href={ticket.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackClick("tickets_click")}
                            style={accentGradient}
                            className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white transition hover:scale-[1.02]"
                          >
                            <Icon name="ticket" className="h-4 w-4" /> {t("event.buy")}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : ticketUrl ? (
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick("tickets_click")}
                    style={accentGradient}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-black text-white transition hover:scale-[1.02]"
                  >
                    <Icon name="ticket" className="h-4 w-4" /> {t("event.buyTickets")}
                  </a>
                ) : event.sold_out ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-bold text-red-300">
                    <Icon name="ban" className="h-4 w-4" /> {t("event.soldOut")}
                  </div>
                ) : past ? (
                  <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-zinc-400">
                    {t("event.finished")}
                  </div>
                ) : null}

                <FavoriteButton itemType="event" itemId={event.id} />
                {!past && <AttendanceButton itemType="event" itemId={event.id} />}
                {!past && (
                  <NearbyVenuesSheet venueType="event" venueId={event.id} name={event.title} latitude={event.latitude} longitude={event.longitude} />
                )}

                <button
                  onClick={shareEvent}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Icon name="share" className="h-4 w-4" /> {t("event.share")}
                </button>

                {event.latitude && event.longitude && (
                  <button
                    onClick={openDirections}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
                  >
                    <Icon name="map" className="h-4 w-4" /> {t("event.directions")}
                  </button>
                )}

                <a
                  href={"/contact?type=report_issue&subject=" + encodeURIComponent(t("event.reportSubjectPrefix") + " " + event.title)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-transparent px-6 py-3 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
                >
                  <Icon name="flag" className="h-3.5 w-3.5" /> {t("event.reportIncorrectInfo")}
                </a>
              </div>
            </Card>

            {event.latitude && event.longitude && (
              <Card innerClassName="">
                <div className="pointer-events-none h-40 overflow-hidden rounded-t-[27px] opacity-90">
                  <ClubMap latitude={event.latitude} longitude={event.longitude} name={event.title} />
                </div>
                <div className="px-5 py-4">
                  <span className="text-sm font-bold text-white">{event.address || venue}</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* CTA FULL-BLEED */}
      {ticketUrl && (
        <Reveal className="w-full px-4 sm:px-6">
          <div style={accentGradient} className="mx-auto max-w-6xl rounded-[36px] px-8 py-14 text-center sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-white/80">{t("event.dontMissIt")}</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">{t("event.secureYourTicket")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">{t("event.ticketsForPrefix")} {event.title} {t("event.sellFastSuffix")}</p>
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("tickets_click")}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 font-bold text-white transition hover:scale-105"
            >
              {t("event.buyTickets")} <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      )}

      <style jsx global>{`
        @keyframes pulseBar {
          0%, 100% { opacity: 0.5; transform: scaleY(0.7); }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </main>
  )
}
