"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Manrope } from "next/font/google"
import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"
import Footer from "../components/layout/Footer"
import EventsSection from "../components/home/EventsSection"
import AreasSection from "../components/home/AreasSection"
import { supabase } from "../lib/supabase"
import { useLanguage } from "../context/LanguageContext"

const display = Manrope({ subsets: ["latin"], weight: ["700", "800"] })

function createSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function isOpenNow(hours?: string): boolean | null {
  if (!hours) return null
  try {
    const order = ["D", "L", "M", "X", "J", "V", "S"]
    const now = new Date()
    const currentDay = order[now.getDay()]
    const currentMin = now.getHours() * 60 + now.getMinutes()
    const prevDay = order[(order.indexOf(currentDay) - 1 + 7) % 7]

    for (const part of hours.split(",")) {
      const m = part.trim().match(/^([A-Z/]+)\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
      if (!m) continue
      const days = m[1].split("/")
      const startMin = parseInt(m[2]) * 60 + parseInt(m[3])
      let endMin = parseInt(m[4]) * 60 + parseInt(m[5])
      const overnight = endMin <= startMin
      if (overnight) endMin += 24 * 60

      for (const d of days) {
        if (d === currentDay && currentMin >= startMin && currentMin <= endMin) return true
        if (d === prevDay && overnight && currentMin + 24 * 60 <= endMin) return true
      }
    }
    return false
  } catch {
    return null
  }
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={style}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  )
}

function useCountUp(target: number, active: boolean, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active || target <= 0) return
    let start: number | null = null
    let raf: number
    const step = (ts: number) => {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setValue(Math.floor(progress * target))
      if (progress < 1) raf = requestAnimationFrame(step)
      else setValue(target)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return value
}

const QUICK_GENRES = [
  { label: "Techno", emoji: "🎛" },
  { label: "Commercial", emoji: "🎤" },
  { label: "Cocktail Bar", emoji: "🍸" },
  { label: "LGTBI+", emoji: "🏳️‍🌈" },
]

const TABS = [
  { key: "all", label: "✨ Para ti" },
  { key: "trending", label: "🔥 Trending" },
  { key: "top", label: "⭐ Mejor valorados" },
  { key: "lgtbi", label: "🏳️‍🌈 LGTBI+" },
  { key: "free", label: "🎟 Gratis" },
]

const TICKER_ITEMS = ["Info actualizada cada noche", "120+ locales en Barcelona", "100% gratis", "Sin registro para explorar"]

export default function Home() {
  const { t } = useLanguage()
  const [clubs, setClubs] = useState<any[]>([])
  const [shuffled, setShuffled] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [spot, setSpot] = useState({ x: 50, y: 25 })

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from("clubs").select("*").eq("hidden", false)
      if (data) {
        setClubs(data)
        setShuffled([...data].sort(() => Math.random() - 0.5))
      }
      setLoading(false)
    }
    fetchClubs()
  }, [])

  const displayedClubs = useMemo(() => {
    let base = clubs
    if (activeTab === "trending") base = clubs.filter((c) => c.trending)
    else if (activeTab === "top") base = [...clubs].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (activeTab === "lgtbi") base = clubs.filter((c) => c.lgtbi)
    else if (activeTab === "free") base = clubs.filter((c) => c.price?.toLowerCase().includes("gratis"))
    else base = shuffled
    return base.slice(0, 6)
  }, [activeTab, clubs, shuffled])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/clubs${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`
  }

  const handleHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const heroCount = useCountUp(clubs.length || 120, !loading)
  const { ref: statRef, visible: statVisible } = useReveal<HTMLDivElement>()
  const footerCount = useCountUp(clubs.length || 120, statVisible)

  return (
    <>
      <Header />

      <main className="relative min-h-screen text-white">
        {/* Ambient background — fixed behind everything, whole page, not just hero */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/25 blur-[120px] animate-[float_18s_ease-in-out_infinite]" />
          <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[130px] animate-[float_22s_ease-in-out_infinite_reverse]" />
          <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-purple-500/15 blur-[140px] animate-[float_20s_ease-in-out_infinite]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="relative z-10">
          {/* HERO */}
          <section
            onMouseMove={handleHeroMove}
            className="relative flex min-h-[92vh] flex-col overflow-hidden"
          >
            <div className="absolute inset-0">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(55% 45% at 18% 12%, rgba(168,85,247,0.28) 0%, rgba(0,0,0,0) 60%), radial-gradient(45% 40% at 88% 8%, rgba(245,180,60,0.14) 0%, rgba(0,0,0,0) 60%), radial-gradient(65% 55% at 50% 105%, rgba(168,85,247,0.16) 0%, rgba(0,0,0,0) 60%)",
                }}
              />
              <div
                className="absolute inset-0 transition duration-300 motion-reduce:hidden"
                style={{
                  background: `radial-gradient(500px circle at ${spot.x}% ${spot.y}%, rgba(168,85,247,0.16), transparent 45%)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
            </div>

            {/* content — centered in the space above the ticker, so it never collides with it */}
            <div className="relative z-10 flex flex-1 items-center">
              <div className="mx-auto w-full max-w-7xl px-6 py-16">
                <div className="fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-300 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                  Barcelona · En directo
                </div>

                <h1
                  className={`${display.className} fade-up mt-8 max-w-4xl text-[3.2rem] leading-[0.98] tracking-tight text-white md:text-7xl lg:text-[6.5rem]`}
                  style={{ animationDelay: "0.08s" }}
                >
                  {t("home.hero") || "Tu noche en Barcelona"}
                  <span className="block bg-gradient-to-r from-purple-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
                    empieza aquí.
                  </span>
                </h1>

                <p
                  className="fade-up mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 md:text-xl"
                  style={{ animationDelay: "0.16s" }}
                >
                  {t("home.subtitle") ||
                    "Descubre los mejores clubs, eventos y planes nocturnos de Barcelona, actualizados cada noche."}
                </p>

                <form
                  onSubmit={handleSearch}
                  className="fade-up mt-10 flex max-w-xl gap-3"
                  style={{ animationDelay: "0.24s" }}
                >
                  <div className="group flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl transition focus-within:border-purple-400/50 focus-within:bg-white/[0.08]">
                    <span className="text-zinc-500 transition group-focus-within:text-purple-300">🔍</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Busca un club, barrio o estilo…"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="group flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition hover:scale-[1.03] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
                  >
                    Buscar
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </button>
                </form>

                <div className="fade-up mt-5 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.3s" }}>
                  {QUICK_GENRES.map((g) => (
                    <Link
                      key={g.label}
                      href={`/clubs?music=${encodeURIComponent(g.label)}`}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-purple-400/40 hover:bg-purple-400/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
                    >
                      {g.emoji} {g.label}
                    </Link>
                  ))}
                  <Link
                    href="/map"
                    className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-xs font-semibold text-zinc-500 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    Ver mapa en directo →
                  </Link>
                </div>

                <div className="fade-up mt-14 flex flex-wrap gap-10 border-t border-white/10 pt-8" style={{ animationDelay: "0.36s" }}>
                  <div>
                    <p className="text-3xl font-black tabular-nums">{heroCount}+</p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Clubs y bares</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black">24/7</p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Info actualizada</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black">100%</p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Gratis para ti</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ticker — normal document flow now, never overlaps the content above */}
            <div className="relative z-10 w-full overflow-hidden border-t border-white/5 bg-black/40 py-3 backdrop-blur">
              <div className="ticker-track flex w-max gap-16 text-xs uppercase tracking-[0.3em] text-zinc-500">
                {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="h-1 w-1 rounded-full bg-purple-400" /> {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Hidden but crawlable — Google OAuth verification purpose statement */}
          <section className="sr-only">
            <h2>{t("home.about_title")}</h2>
            <p>{t("home.about_text")}</p>
          </section>

          {/* DESTACADOS */}
          <section className="mx-auto max-w-7xl px-6 py-24">
            <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Esta noche</p>
                <h2 className={`${display.className} mt-3 text-4xl tracking-tight md:text-5xl`}>Destacados</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400 ${
                      activeTab === tab.key
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </Reveal>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-80 animate-pulse rounded-[28px] bg-white/[0.03]" />
                ))
              ) : displayedClubs.length === 0 ? (
                <p className="col-span-full py-16 text-center text-zinc-500">
                  No hay resultados para este filtro ahora mismo.
                </p>
              ) : (
                displayedClubs.map((club, index) => {
                  const open = isOpenNow(club.hours)
                  return (
                    <Reveal key={club.id} style={{ transitionDelay: `${index * 70}ms` }}>
                      <Link
                        href={`/clubs/${club.slug || createSlug(club.name)}`}
                        className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-[28px] border border-white/10 transition duration-500 hover:-translate-y-1.5 hover:border-purple-400/30 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.35)]"
                      >
                        <img
                          src={club.image || "/clubs/razz.jpg"}
                          alt={club.name}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          {club.trending && (
                            <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-black">
                              🔥 Trending
                            </span>
                          )}
                          {club.verified && (
                            <span className="flex items-center gap-1 rounded-full bg-purple-500/90 px-3 py-1 text-[11px] font-bold text-white">
                              ● Verified
                            </span>
                          )}
                        </div>

                        {open !== null && (
                          <span
                            className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur ${
                              open ? "bg-emerald-400/90 text-black" : "bg-white/10 text-zinc-300"
                            }`}
                          >
                            {open ? "Abierto ahora" : "Cerrado"}
                          </span>
                        )}

                        <div className="relative z-10 p-6">
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">
                              {club.neighborhood || "Barcelona"}
                            </p>
                            {club.rating && (
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
                                ★ {Number(club.rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-2xl font-black text-white">{club.name}</h3>
                          <div className="mt-2 flex items-center gap-3 text-sm text-zinc-300">
                            <span>{club.music || "Nightlife"}</span>
                            {club.price && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <span>{club.price}</span>
                              </>
                            )}
                          </div>
                          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
                            Ver ficha <span className="transition group-hover:translate-x-1">→</span>
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  )
                })
              )}
            </div>

            <Reveal className="mt-12 text-center">
              <Link
                href="/clubs"
                className="group inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-8 py-4 font-bold text-white transition hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
              >
                Explorar todos los clubs
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
            </Reveal>
          </section>

          <Reveal>
            <EventsSection />
          </Reveal>
          <Reveal>
            <AreasSection />
          </Reveal>
              </div>
      </main>

      <Footer />
      <BottomNav />

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-up {
          animation: fadeUp 0.6s ease-out both;
        }
        @keyframes tickerScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-33.333%);
          }
        }
        .ticker-track {
          animation: tickerScroll 22s linear infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -20px) scale(1.08);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .fade-up,
          .ticker-track {
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}