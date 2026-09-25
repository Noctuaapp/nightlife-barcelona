"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import FavoriteButton from "../favorites/FavoriteButton"
import ClubMap from "../map/ClubMap"
import ClubNightsCalendar from "../nightlife/ClubNightsCalendar"
import TransportButtons from "../ui/TransportButtons"
import { supabase } from "../../lib/supabase"

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

const createSlug = (text: string) =>
  (text || "").toLowerCase().normalize("NFD").replace(ACCENT_PATTERN, "").replace(/\s+/g, "-")

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
    case "leaf": return <svg {...p}><path d="M5 20c8 0 14-6 14-14 0 0-13-2-14 9-.3 3 0 5 0 5z" /><path d="M5 20c1-4 4-8 9-11" /></svg>
    case "sofa": return <svg {...p}><path d="M4 12v5a1 1 0 001 1h1v2M18 18h1a1 1 0 001-1v-5M4 12a2 2 0 012-2h12a2 2 0 012 2M4 12v3h16v-3M17 18v2" /></svg>
    case "cigarette": return <svg {...p}><rect x="2" y="10" width="16" height="4" rx="1" /><path d="M8 10v4M18 8c1 1 1 2 0 3M20 7c1.5 1.5 1.5 3.5 0 5" /></svg>
    case "clipboard": return <svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h4" /></svg>
    case "shirt": return <svg {...p}><path d="M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z" /></svg>
    case "pride": return <svg {...p} strokeWidth={2}><path d="M4 6h16M4 10.5h16M4 15h16M4 19.5h16" /></svg>
    case "music": return <svg {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
    case "ticket": return <svg {...p}><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" /></svg>
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
    case "hourglass": return <svg {...p}><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" /></svg>
    case "thermometer": return <svg {...p}><path d="M12 15V4a2 2 0 10-4 0v11a4 4 0 104 0z" /></svg>
    case "map": return <svg {...p}><path d="M9 20l-6-2V6l6 2 6-2 6 2v12l-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
    case "share": return <svg {...p}><circle cx="6" cy="12" r="2.3" /><circle cx="18" cy="6" r="2.3" /><circle cx="18" cy="18" r="2.3" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg>
    case "flag": return <svg {...p}><path d="M5 3v18M5 4h13l-3 4 3 4H5" /></svg>
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case "flame": return <svg {...p}><path d="M12 3c1 3-2 4-2 7a4 4 0 108 0c0-1-1-2-1-2 1 4-1 5-1 5 2-1 3-4 3-6 0-5-4-6-4-9-1 2-3 3-3 5z" /></svg>
    case "ban": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></svg>
    case "check": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
    case "heart": return <svg {...p}><path d="M12 20s-7-4.6-9.5-9.2C1 7.3 3 4 6.5 4 9 4 11 6 12 7c1-1 3-3 5.5-3C21 4 23 7.3 21.5 10.8 19 15.4 12 20 12 20z" /></svg>
    case "back": return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    case "close": return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case "instagram": return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" /></svg>
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="17" cy="9" r="2.4" /><path d="M20.5 20c-.2-2.4-1.5-4.2-3.5-5" /></svg>
    case "id": return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="12" r="2" /><path d="M6 16c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2M14 9h4M14 12h4M14 15h2" /></svg>
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

export default function ClubPageContent({ club, clubEvents }: { club: any; clubEvents: any[] }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<"about" | "nights" | "location">("about")
  const [related, setRelated] = useState<any[]>([])
  const [favCount, setFavCount] = useState<number | null>(null)
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [spot, setSpot] = useState({ x: 50, y: 30 })
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  const accent = hashAccent(club.music || club.name || "noctua")
  const ticketUrl = club.tickets_url || club.ticket_url || club.entradas_url || club.website
  const reviewCount = club.review_count || club.reviews_count || null
  const capacity = club.capacity || club.aforo || null
  const minAge = club.min_age || club.edad_minima || null
  const instagram = club.instagram || club.instagram_url || null

  useEffect(() => {
    const idm = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(idm)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 560)
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const loadRelated = async () => {
      const { data } = await supabase.from("clubs").select("*").eq("hidden", false).neq("id", club.id).limit(8)
      if (data) {
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 3)
        setRelated(shuffled)
      }
    }
    const loadFavCount = async () => {
      const { count } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("item_type", "club")
        .eq("item_id", club.id)
      setFavCount(count ?? 0)
    }
    const loadWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.3874&longitude=2.1686&current_weather=true")
        const data = await res.json()
        if (data?.current_weather?.temperature != null) {
          setWeatherTemp(Math.round(data.current_weather.temperature))
        }
      } catch {}
    }
    loadRelated()
    loadFavCount()
    loadWeather()
  }, [club.id])

  const trackClick = async (eventType: string) => {
    await supabase.from("analytics").insert({
      event_type: eventType,
      item_type: "club",
      item_id: club.id,
      item_name: club.name,
    })
  }

  const shareClub = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: club.name, text: `Mira ${club.name} en Noctua`, url })
      } catch {}
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      window.alert("Enlace copiado")
    }
  }

  const goToLocation = () => {
    setActiveTab("location")
    document.getElementById("club-content")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const openDirections = () => {
    trackClick("directions_click")
    if (club.latitude && club.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${club.latitude},${club.longitude}`, "_blank")
    } else if (club.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(club.address + " " + (club.name || ""))}`, "_blank")
    } else {
      goToLocation()
    }
  }

  const goToNights = () => {
    setActiveTab("nights")
    document.getElementById("club-content")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const hasNights = clubEvents && clubEvents.length > 0

  const nextEvent = hasNights
    ? [...clubEvents]
        .filter((ev) => {
          const d = ev?.date || ev?.event_date
          return d && new Date(d).getTime() > now
        })
        .sort((a, b) => {
          const da = new Date(a?.date || a?.event_date).getTime()
          const db = new Date(b?.date || b?.event_date).getTime()
          return da - db
        })[0]
    : null

  const countdown = (() => {
    if (!nextEvent) return null
    const target = new Date(nextEvent.date || nextEvent.event_date).getTime()
    const diff = target - now
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return { days, hours, mins }
  })()

  const features = [
    { key: "terrace", label: "Terraza", icon: "leaf", active: !!club.terrace },
    { key: "vip", label: "Mesas VIP", icon: "sofa", active: !!club.vip_tables },
    { key: "smoking", label: "Zona fumadores", icon: "cigarette", active: !!club.smoking_area },
    { key: "booking", label: "Reserva de mesa", icon: "clipboard", active: !!club.table_booking },
    { key: "lgtbi", label: "LGTBI+ friendly", icon: "pride", active: !!club.lgtbi_friendly },
    { key: "dresscode", label: club.dresscode || "Dresscode", icon: "shirt", active: !!club.dresscode },
    { key: "capacity", label: capacity ? `Aforo: ${capacity} personas` : "", icon: "users", active: !!capacity },
    { key: "minage", label: minAge ? `Edad mínima: ${minAge} años` : "", icon: "id", active: !!minAge },
  ].filter((f) => f.active)

  const ratingRounded = club.rating ? Math.round(club.rating) : 0

  const energyLevel = club.sold_out
    ? { label: "Lleno", bars: 5, color: "bg-red-400" }
    : club.queue && !/no queue|sin cola/i.test(club.queue)
    ? { label: "Animado", bars: 3, color: "bg-amber-400" }
    : club.trending
    ? { label: "Animado", bars: 3, color: "bg-amber-400" }
    : { label: "Tranquilo", bars: 1, color: "bg-emerald-400" }

  const galleryImages: string[] = (Array.isArray(club.gallery)
    ? club.gallery
    : Array.isArray(club.images)
    ? club.images
    : [club.image_2, club.image_3, club.image_4].filter(Boolean)
  ).filter((src: any) => typeof src === "string" && src.length > 0)

  const allImages = [club.image, ...galleryImages].filter(Boolean)

  const faqs = [
    club.price && { q: "¿Cuánto cuesta la entrada?", a: `El precio orientativo es ${club.price}.` },
    club.hours && { q: "¿Hasta qué hora abren?", a: `El horario habitual es ${club.hours}.` },
    club.dresscode && { q: "¿Hay dresscode?", a: `Sí, el dresscode es: ${club.dresscode}.` },
    club.table_booking && { q: "¿Se puede reservar mesa?", a: "Sí, este local permite reservar mesa con antelación." },
    club.vip_tables && { q: "¿Tienen zona VIP?", a: "Sí, cuentan con servicio de mesas VIP." },
    club.smoking_area && { q: "¿Hay zona de fumadores?", a: "Sí, dispone de una zona habilitada para fumadores." },
    club.queue && { q: "¿Suele haber cola?", a: `Estado actual de la cola: ${club.queue}.` },
    minAge && { q: "¿Cuál es la edad mínima?", a: `La edad mínima para entrar es de ${minAge} años.` },
    capacity && { q: "¿Cuál es el aforo del local?", a: `Este local tiene un aforo de ${capacity} personas.` },
  ].filter(Boolean) as { q: string; a: string }[]

  const accentGradient = { background: `linear-gradient(135deg, ${accent.from} 0%, ${accent.to} 100%)` }

  return (
    <main className="min-h-screen bg-[#050308] text-white">
      {/* STICKY COMPACT BAR */}
      <div
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#050308]/90 px-5 py-3 backdrop-blur-2xl transition-all duration-300 ${
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl">
            <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{club.name}</p>
            {club.rating && <p className="text-xs" style={{ color: accent.from }}>★ {club.rating}</p>}
          </div>
        </div>
        <button
          onClick={openDirections}
          className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:scale-105"
        >
          Cómo llegar
        </button>
      </div>

      {/* HERO */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="relative flex h-[100vh] min-h-[720px] items-end overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={club.image || "/clubs/razz.jpg"}
            alt={club.name}
            style={{ transform: `translateY(${scrollY * 0.35}px) scale(1.15)` }}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out will-change-transform"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050308] via-black/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-transparent to-black/40" />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.65)" }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-80 mix-blend-soft-light transition-[background] duration-300"
          style={{
            background: `radial-gradient(650px circle at ${spot.x}% ${spot.y}%, rgba(${accent.glow},0.4), transparent 60%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-start px-6 pt-6">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-xl transition hover:bg-white/10"
          >
            <Icon name="back" className="h-5 w-5" />
          </Link>
        </div>

        <div className="relative z-10 w-full px-6 pb-10 md:pb-14">
          <div className="mx-auto max-w-7xl">
            <div
              style={{ transitionDelay: "0ms" }}
              className={`flex flex-wrap items-center gap-2 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              {club.trending && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 backdrop-blur-xl">
                  <Icon name="flame" className="h-3.5 w-3.5" /> {t("club.trending")}
                </span>
              )}
              {club.sold_out && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-300 backdrop-blur-xl">
                  <Icon name="ban" className="h-3.5 w-3.5" /> {t("club.sold_out")}
                </span>
              )}
              {club.verified && (
                <span className="flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-xs font-bold text-blue-300 backdrop-blur-xl">
                  <Icon name="check" className="h-3.5 w-3.5" /> Verificado
                </span>
              )}
              {favCount !== null && favCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-pink-400/30 bg-pink-400/10 px-4 py-2 text-xs font-bold text-pink-300 backdrop-blur-xl">
                  <Icon name="heart" className="h-3.5 w-3.5" /> <CountUp value={favCount} /> lo tienen guardado
                </span>
              )}
            </div>

            <div
              style={{ transitionDelay: "120ms" }}
              className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.5em]" style={{ color: accent.from }}>
                {club.music || "Barcelona nightlife"}
              </p>
              <h1 className="mt-3 text-[15vw] font-black leading-[0.85] tracking-tighter text-white sm:text-[11vw] md:text-[8.5rem]">
                {club.name}
              </h1>
              <p className="mt-4 text-sm uppercase tracking-[0.35em] text-zinc-400">{club.neighborhood || "Barcelona"}</p>
            </div>

            {club.rating && (
              <div
                style={{ transitionDelay: "220ms" }}
                className={`mt-6 flex items-center gap-2 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= ratingRounded ? "" : "text-white/20"} style={n <= ratingRounded ? { color: accent.from } : undefined}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm font-semibold text-zinc-300">
                  <CountUp value={club.rating} decimals={1} />/5
                </span>
                {reviewCount ? (
                  <span className="text-sm text-zinc-500">
                    (<CountUp value={reviewCount} /> reseñas)
                  </span>
                ) : (
                  club.people && (
                    <span className="text-sm text-zinc-500">
                      · <CountUp value={club.people} /> han estado aquí
                    </span>
                  )
                )}
              </div>
            )}

            <div
              style={{ transitionDelay: "320ms" }}
              className={`mt-8 flex flex-wrap items-center gap-3 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              {club.website && (
                <a
                  href={club.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("website_click")}
                  style={accentGradient}
                  className="rounded-2xl px-7 py-4 font-black text-white transition hover:scale-[1.02] hover:opacity-90"
                >
                  Web oficial
                </a>
              )}

              <div className="ml-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl">
                <div className="flex h-4 items-end gap-[3px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full ${i < energyLevel.bars ? energyLevel.color : "bg-white/15"} motion-safe:animate-[pulseBar_1.2s_ease-in-out_infinite]`}
                      style={{ height: `${30 + i * 14}%`, animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-zinc-300">{energyLevel.label} ahora</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center motion-safe:animate-bounce">
          <span className="text-white/50">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M6 9l6 6 6-6" /></svg>
          </span>
        </div>
      </section>

      {/* COUNTDOWN */}
      {nextEvent && countdown && (
        <Reveal className="relative z-10 mx-auto -mt-10 max-w-7xl px-4">
          <button
            onClick={goToNights}
            style={{ background: `linear-gradient(110deg, rgba(${accent.glow},0.28), rgba(${accent.glow},0.06))` }}
            className="group flex w-full flex-col items-stretch gap-5 overflow-hidden rounded-[28px] border border-white/10 p-6 text-left backdrop-blur-2xl transition hover:border-white/25 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent.from }}>Próxima noche</p>
              <p className="mt-2 truncate text-xl font-black text-white md:text-2xl">
                {nextEvent.name || nextEvent.title || club.name}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              {[
                { v: countdown.days, l: "días" },
                { v: countdown.hours, l: "horas" },
                { v: countdown.mins, l: "min" },
              ].map((u) => (
                <div key={u.l} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center">
                  <p className="text-2xl font-black text-white tabular-nums">{u.v}</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400">{u.l}</p>
                </div>
              ))}
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition group-hover:scale-105 sm:flex">
                Ver noches <Icon name="arrow" className="h-4 w-4" />
              </span>
            </div>
          </button>
        </Reveal>
      )}

      {/* BENTO GRID */}
      <Reveal className={`relative z-10 mx-auto max-w-7xl px-4 ${nextEvent ? "mt-6" : "-mt-10"}`}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2">
          <Card className="col-span-2 row-span-2" innerClassName="p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t("club.experience")}</p>
            <p className="mt-4 text-lg leading-relaxed text-zinc-200 first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8] first-letter:text-white">
              {club.description ||
                `${club.name} es uno de los locales de referencia de la noche de Barcelona, conocido por su ${
                  club.music ? `${club.music.toLowerCase()} ` : ""
                }${t("club.atmosphere")} y su energía en directo.`}
            </p>
          </Card>

          <Card innerClassName="p-5">
            <Icon name="music" className="h-5 w-5" style={{ color: accent.from }} />
            <p className="mt-3 truncate text-sm font-bold text-white">{club.music || "TBA"}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{t("club.music")}</p>
          </Card>
          <Card innerClassName="p-5">
            <Icon name="ticket" className="h-5 w-5" style={{ color: accent.from }} />
            <p className="mt-3 truncate text-sm font-bold text-white">{club.price || "TBA"}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{t("club.price")}</p>
          </Card>
          <Card innerClassName="p-5">
            <Icon name="clock" className="h-5 w-5" style={{ color: accent.from }} />
            <p className="mt-3 truncate text-sm font-bold text-white">{club.hours || "TBA"}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{t("club.hours")}</p>
          </Card>
          <Card innerClassName="p-5">
            <Icon name="hourglass" className="h-5 w-5" style={{ color: accent.from }} />
            <p className="mt-3 truncate text-sm font-bold text-white">{club.queue || t("club.no_queue")}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{t("club.queue")}</p>
          </Card>

          {weatherTemp !== null && (
            <Card innerClassName="p-5">
              <Icon name="thermometer" className="h-5 w-5" style={{ color: accent.from }} />
              <p className="mt-3 text-sm font-bold text-white">{weatherTemp}°C</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Barcelona ahora</p>
            </Card>
          )}
        </div>
      </Reveal>

      {/* GALERIA FULL-BLEED */}
      {allImages.length > 1 && (
        <Reveal className="mt-16">
          <p className="mx-auto max-w-7xl px-4 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-5">Galería</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {allImages.map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="group relative h-[60vw] w-[78vw] shrink-0 snap-center overflow-hidden rounded-[28px] sm:h-[380px] sm:w-[520px]"
              >
                <img src={src} alt={`${club.name} ${i + 1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
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
          <img src={allImages[lightboxIndex]} alt={club.name} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      )}

      <section id="club-content" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 pb-24">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* LEFT — TABS */}
          <div className="lg:col-span-2">
            <div className="mb-8 flex gap-2 overflow-x-auto">
              {[
                { key: "about", label: "Sobre el club" },
                ...(hasNights ? [{ key: "nights", label: "Próximas noches" }] : []),
                { key: "location", label: "Ubicación" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`shrink-0 rounded-full px-6 py-3 text-sm font-bold transition ${
                    activeTab === tab.key ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "about" && (
              <div className="space-y-8">
                {features.length > 0 && (
                  <Card innerClassName="p-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">Lo que ofrece</p>
                    <div className="divide-y divide-white/10">
                      {features.map((f) => (
                        <div key={f.key} className="flex items-center gap-4 py-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10" style={{ color: accent.from }}>
                            <Icon name={f.icon} className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-semibold text-white">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card innerClassName="p-8">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-6">{t("club.night_info")}</p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {club.metro_lines && (
                      <div>
                        <p className="text-xs text-zinc-500">{t("club.metro")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {club.metro_lines.split(",").map((line: string) => (
                            <span key={line.trim()} className="rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-sm font-bold text-red-300">
                              {line.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {club.night_buses && (
                      <div>
                        <p className="text-xs text-zinc-500">{t("club.night_buses")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {club.night_buses.split(",").map((bus: string) => (
                            <span key={bus.trim()} className="rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-sm font-bold text-blue-300">
                              {bus.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {faqs.length > 0 && (
                  <Card innerClassName="p-8">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">Preguntas frecuentes</p>
                    <div className="divide-y divide-white/10">
                      {faqs.map((f, i) => (
                        <div key={i} className="py-4">
                          <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 text-left">
                            <span className="text-sm font-bold text-white">{f.q}</span>
                            <span className={`shrink-0 text-xl text-zinc-500 transition-transform duration-300 ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                          </button>
                          <div className={`grid transition-all duration-300 ${openFaq === i ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <div className="overflow-hidden">
                              <p className="text-sm leading-relaxed text-zinc-400">{f.a}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "nights" && hasNights && (
              <Card innerClassName="p-8">
                <ClubNightsCalendar clubEvents={clubEvents} clubName={club.name} />
              </Card>
            )}

            {activeTab === "location" && (
              <Card innerClassName="p-8">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-4">{t("club.location")}</p>
                {club.latitude && club.longitude ? (
                  <>
                    <div className="overflow-hidden rounded-2xl">
                      <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                    </div>
                    {club.address && <p className="mt-4 text-sm text-zinc-400">{club.address}</p>}
                    <button
                      onClick={openDirections}
                      style={accentGradient}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white transition hover:scale-[1.01]"
                    >
                      <Icon name="map" className="h-4 w-4" /> Abrir ruta en Google Maps
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Ubicación no disponible.</p>
                )}
                <div className="mt-6">
                  <TransportButtons name={club.name} address={club.address} lat={club.latitude} lng={club.longitude} />
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT — ACCIONES */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <Card innerClassName="">
              <div className="flex items-center gap-4 border-b border-white/10 p-6">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                  <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">{club.name}</p>
                  <p className="truncate text-sm text-zinc-500">{club.neighborhood || "Barcelona"}</p>
                </div>
              </div>

              <div className="space-y-3 p-6">
                {ticketUrl && (
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick("tickets_click")}
                    style={accentGradient}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-black text-white transition hover:scale-[1.02]"
                  >
                    <Icon name="ticket" className="h-4 w-4" /> Comprar entradas
                  </a>
                )}

                <FavoriteButton itemType="club" itemId={club.id} />

                <div className="flex gap-3">
                  <button
                    onClick={shareClub}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    <Icon name="share" className="h-4 w-4" /> Compartir
                  </button>
                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick("instagram_click")}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                    >
                      <Icon name="instagram" className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <button
                  onClick={openDirections}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
                >
                  <Icon name="map" className="h-4 w-4" /> Cómo llegar
                </button>

                <a
                  href={"/contact?type=report_issue&subject=" + encodeURIComponent("Reporte: " + club.name)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-transparent px-6 py-3 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
                >
                  <Icon name="flag" className="h-3.5 w-3.5" /> Reportar información incorrecta
                </a>
              </div>
            </Card>

            {club.latitude && club.longitude && (
              <Card as="button" onClick={goToLocation} className="group block w-full text-left" innerClassName="">
                <div className="pointer-events-none h-40 overflow-hidden rounded-t-[27px] opacity-90 transition group-hover:opacity-100">
                  <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm font-bold text-white">Ver mapa y transporte</span>
                  <Icon name="arrow" className="h-4 w-4 text-zinc-500" />
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* CTA FULL-BLEED */}
      {ticketUrl && (
        <Reveal className="w-full px-4">
          <div style={accentGradient} className="mx-auto max-w-7xl rounded-[36px] px-8 py-14 text-center sm:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-white/80">¿Te vienes esta noche?</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">Asegura tu entrada</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Las mejores noches en {club.name} se llenan rápido. Compra ahora y evita la cola.
            </p>
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("tickets_click")}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 font-bold text-white transition hover:scale-105"
            >
              Comprar entradas <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      )}

      {/* RELACIONADOS */}
      {related.length > 0 && (
        <Reveal className="mx-auto max-w-7xl px-4 py-20">
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-zinc-500">También te puede interesar</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={`/clubs/${createSlug(r.name)}`} className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/20">
                <div className="relative h-44 overflow-hidden">
                  <img src={r.image || "/clubs/razz.jpg"} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <p className="text-lg font-black text-white">{r.name}</p>
                    <p className="text-xs text-zinc-300">{r.neighborhood || "Barcelona"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      {/* FLOATING MOBILE ACTION BAR */}
      <div className="fixed inset-x-4 bottom-24 z-40 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl lg:hidden">
        <button onClick={openDirections} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-black">
          <Icon name="map" className="h-4 w-4" /> Cómo llegar
        </button>
        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick("tickets_click")}
            style={accentGradient}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          >
            <Icon name="ticket" className="h-4 w-4" />
          </a>
        )}
        <button onClick={shareClub} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Icon name="share" className="h-4 w-4" />
        </button>
      </div>

      <style jsx global>{`
        @keyframes pulseBar {
          0%, 100% {
            opacity: 0.5;
            transform: scaleY(0.7);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </main>
  )
}
