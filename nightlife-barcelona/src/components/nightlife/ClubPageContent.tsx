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

export default function ClubPageContent({ club, clubEvents }: { club: any; clubEvents: any[] }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<"about" | "nights" | "location">("about")
  const [related, setRelated] = useState<any[]>([])
  const [favCount, setFavCount] = useState<number | null>(null)
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [spot, setSpot] = useState({ x: 50, y: 30 })
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [mounted, setMounted] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const heroRef = useRef<HTMLDivElement>(null)

  const accent = hashAccent(club.music || club.name || "noctua")
  const ticketUrl = club.tickets_url || club.ticket_url || club.entradas_url || club.website
  const displayRating = club.google_rating || club.rating || null
  const reviewCount = club.google_review_count || club.review_count || club.reviews_count || null
  const capacity = club.capacity || club.aforo || null
  const minAge = club.min_age || club.edad_minima || null
  const instagram = club.instagram || club.instagram_url || null

  useEffect(() => {
    const idm = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(idm)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setPastHero(window.scrollY > (heroRef.current?.offsetHeight || 640) - 120)
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
    const loadReviews = async () => {
      const { data } = await supabase
        .from("club_reviews")
        .select("*")
        .eq("club_id", club.id)
        .order("rating", { ascending: false })
      if (data) setReviews(data)
    }
    loadRelated()
    loadFavCount()
    loadWeather()
    loadReviews()
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

  const ratingRounded = displayRating ? Math.round(displayRating) : 0

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

  const quickFacts = [
    { key: "music", icon: "music", value: club.music || "TBA", label: t("club.music") },
    { key: "price", icon: "ticket", value: club.price || "TBA", label: t("club.price") },
    { key: "hours", icon: "clock", value: club.hours || "TBA", label: t("club.hours") },
    { key: "queue", icon: "hourglass", value: club.queue || t("club.no_queue"), label: t("club.queue") },
    ...(weatherTemp !== null ? [{ key: "weather", icon: "thermometer", value: `${weatherTemp}°C`, label: "Barcelona ahora" }] : []),
  ]

  return (
    <main className="min-h-screen bg-[#050308] text-white">
      {/* HEADER — persistente, cambia de estado al hacer scroll */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-3.5 transition-all duration-300 sm:px-6 ${
          scrolled ? "border-b border-white/10 bg-[#050308]/90 backdrop-blur-2xl" : "bg-gradient-to-b from-black/60 to-transparent"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
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
              <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="h-full w-full object-cover" />
            </div>
            <p className="truncate text-sm font-black text-white">{club.name}</p>
            {displayRating && (
              <span className="hidden shrink-0 items-center gap-1 text-xs font-bold text-zinc-300 sm:flex">
                <Icon name="star" className="h-3 w-3" style={{ color: accent.from }} /> {Number(displayRating).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={shareClub}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-xl transition hover:bg-white/10 sm:flex"
          >
            <Icon name="share" className="h-4 w-4" />
          </button>
          <button
            onClick={openDirections}
            className="rounded-full bg-white px-4 py-2.5 text-xs font-black text-black transition hover:scale-105 sm:px-5 sm:text-sm"
          >
            Cómo llegar
          </button>
        </div>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="relative flex h-[88vh] min-h-[620px] items-end overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={club.image || "/clubs/razz.jpg"}
            alt={club.name}
            style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.12)` }}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out will-change-transform"
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
            <div
              className={`flex flex-wrap items-center gap-2 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              {club.trending && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-bold text-emerald-300 backdrop-blur-xl">
                  <Icon name="flame" className="h-3 w-3" /> {t("club.trending")}
                </span>
              )}
              {club.sold_out && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3.5 py-1.5 text-[11px] font-bold text-red-300 backdrop-blur-xl">
                  <Icon name="ban" className="h-3 w-3" /> {t("club.sold_out")}
                </span>
              )}
              {club.verified && (
                <span className="flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-400/10 px-3.5 py-1.5 text-[11px] font-bold text-blue-300 backdrop-blur-xl">
                  <Icon name="check" className="h-3 w-3" /> Verificado
                </span>
              )}
            </div>

            <div
              style={{ transitionDelay: "100ms" }}
              className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.4em]" style={{ color: accent.from }}>
                {club.music || "Barcelona nightlife"}
              </p>
              <h1 className="mt-3 text-[13vw] font-black leading-[0.9] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                {club.name}
              </h1>
            </div>

            <div
              style={{ transitionDelay: "180ms" }}
              className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                <Icon name="map" className="h-3.5 w-3.5 text-zinc-500" /> {club.neighborhood || "Barcelona"}
              </span>
              {displayRating && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-600" />
                  <span className="flex items-center gap-2">
                    <Stars rating={displayRating} color={accent.from} />
                    <span className="text-sm font-bold text-white">
                      <CountUp value={displayRating} decimals={1} />
                    </span>
                    {reviewCount ? (
                      <span className="text-sm text-zinc-500">
                        (<CountUp value={reviewCount} /> reseñas de Google)
                      </span>
                    ) : (
                      club.people && (
                        <span className="text-sm text-zinc-500">
                          · <CountUp value={club.people} /> han estado aquí
                        </span>
                      )
                    )}
                  </span>
                </>
              )}
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-xl">
                <span className="flex h-3 items-end gap-[2px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`w-[3px] rounded-full ${i < energyLevel.bars ? energyLevel.color : "bg-white/15"} motion-safe:animate-[pulseBar_1.2s_ease-in-out_infinite]`}
                      style={{ height: `${30 + i * 14}%`, animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </span>
                <span className="text-xs font-semibold text-zinc-300">{energyLevel.label} ahora</span>
              </span>
            </div>

            <div
              style={{ transitionDelay: "260ms" }}
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
              <button
                onClick={openDirections}
                className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white backdrop-blur-xl transition hover:bg-white/10"
              >
                <Icon name="map" className="h-4 w-4" /> Cómo llegar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK FACTS STRIP */}
      <Reveal className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <Card innerClassName="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0 lg:grid-cols-5">
          {quickFacts.map((f, i) => (
            <div key={f.key} className={`flex items-center gap-3 p-5 ${i === 0 ? "" : ""}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10" style={{ color: accent.from }}>
                <Icon name={f.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{f.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">{f.label}</p>
              </div>
            </div>
          ))}
        </Card>
      </Reveal>

      {/* COUNTDOWN */}
      {nextEvent && countdown && (
        <Reveal className="relative z-10 mx-auto mt-6 max-w-6xl px-4 sm:px-6">
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

      {/* GALERIA */}
      {allImages.length > 1 && (
        <Reveal className="mt-16">
          <p className="mx-auto max-w-6xl px-4 text-xs uppercase tracking-[0.3em] text-zinc-500 mb-5 sm:px-6">Galería</p>

          {/* Mosaico en desktop */}
          <div className="mx-auto hidden max-w-6xl grid-cols-4 grid-rows-2 gap-3 px-6 sm:grid" style={{ height: 420 }}>
            {allImages.slice(0, 5).map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"}`}
              >
                <img src={src} alt={`${club.name} ${i + 1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                {i === 4 && allImages.length > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-black text-white">
                    +{allImages.length - 5}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Scroll horizontal en mobile */}
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:hidden">
            {allImages.map((src: string, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="group relative h-[60vw] w-[78vw] shrink-0 snap-center overflow-hidden rounded-[28px]"
              >
                <img src={src} alt={`${club.name} ${i + 1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
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
          <img src={allImages[lightboxIndex]} alt={club.name} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % allImages.length) }}
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white sm:right-8"
          >
            <Icon name="arrow" className="h-5 w-5" />
          </button>
        </div>
      )}

      <section id="club-content" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-16 pb-24 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* LEFT */}
          <div className="lg:col-span-2">
            <Reveal>
              <Card innerClassName="p-8">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t("club.experience")}</p>
                <p className="mt-4 text-lg leading-relaxed text-zinc-200 first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8] first-letter:text-white">
                  {club.description ||
                    `${club.name} es uno de los locales de referencia de la noche de Barcelona, conocido por su ${
                      club.music ? `${club.music.toLowerCase()} ` : ""
                    }${t("club.atmosphere")} y su energía en directo.`}
                </p>
              </Card>
            </Reveal>

            <div className="sticky top-[68px] z-30 mt-8 mb-8 flex gap-2 overflow-x-auto bg-[#050308]/90 py-3 backdrop-blur-xl">
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
                  <Reveal>
                    <Card innerClassName="p-8">
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-5">Lo que ofrece</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {features.map((f) => (
                          <div key={f.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10" style={{ color: accent.from }}>
                              <Icon name={f.icon} className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-semibold text-white">{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Reveal>
                )}

                {(club.metro_lines || club.night_buses) && (
                  <Reveal>
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
                            <p className="mt-1 text-xs text-zinc-500">{reviewCount ? `${reviewCount} reseñas` : `${reviews.length} reseñas`}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          <Icon name="google" className="h-3.5 w-3.5" /> Reseñas de Google
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

                {faqs.length > 0 && (
                  <Reveal>
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
                  </Reveal>
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

          {/* RIGHT — SIDEBAR */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <Card innerClassName="">
              <div className="flex items-center gap-4 border-b border-white/10 p-6">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                  <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">{club.name}</p>
                  <p className="truncate text-sm text-zinc-500">{club.neighborhood || "Barcelona"}</p>
                  {displayRating && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Stars rating={displayRating} color={accent.from} />
                      <span className="text-xs font-bold text-zinc-300">{Number(displayRating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {(club.price || club.hours || club.dresscode || minAge) && (
                <div className="space-y-2.5 border-b border-white/10 p-6 text-sm">
                  {club.price && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Precio</span>
                      <span className="font-semibold text-white">{club.price}</span>
                    </div>
                  )}
                  {club.hours && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Horario</span>
                      <span className="font-semibold text-white">{club.hours}</span>
                    </div>
                  )}
                  {club.dresscode && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Dresscode</span>
                      <span className="font-semibold text-white">{club.dresscode}</span>
                    </div>
                  )}
                  {minAge && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Edad mínima</span>
                      <span className="font-semibold text-white">{minAge} años</span>
                    </div>
                  )}
                </div>
              )}

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
        <Reveal className="w-full px-4 sm:px-6">
          <div style={accentGradient} className="mx-auto max-w-6xl rounded-[36px] px-8 py-14 text-center sm:py-20">
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
        <Reveal className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-zinc-500">También te puede interesar</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {related.map((r) => {
              const rRating = r.google_rating || r.rating || null
              return (
                <Link key={r.id} href={`/clubs/${createSlug(r.name)}`} className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition hover:border-white/20">
                  <div className="relative h-44 overflow-hidden">
                    <img src={r.image || "/clubs/razz.jpg"} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    {rRating && (
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xl">
                        <Icon name="star" className="h-3 w-3 text-amber-400" /> {Number(rRating).toFixed(1)}
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 p-4">
                      <p className="text-lg font-black text-white">{r.name}</p>
                      <p className="text-xs text-zinc-300">{r.neighborhood || "Barcelona"}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </Reveal>
      )}

      {/* FLOATING MOBILE ACTION BAR */}
      <div className="fixed inset-x-4 bottom-24 z-40 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl lg:hidden">
        <button onClick={openDirections} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-black">
          <Icon name="map" className="h-4 w-4" /> Cómo llegar
        </button>
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
