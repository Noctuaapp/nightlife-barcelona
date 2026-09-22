"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

const isEventPast = (date: string): boolean => {
  if (!date) return false
  const eventDate = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return eventDate < now
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
      { threshold: 0.1 }
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
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  )
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const PAGE_SIZE = 9

export default function EventsExplorer({ initialEvents }: { initialEvents: any[] }) {
  const [events] = useState<any[]>(initialEvents)
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [nearMe, setNearMe] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [hidePast, setHidePast] = useState(false)
  const [sortBy, setSortBy] = useState<"date" | "date_desc" | "featured">("date")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { t } = useLanguage()

  const filters = [
    { key: "festival", label: t("events.festival") },
    { key: "neighborhood", label: t("events.neighborhood") },
    { key: "free", label: t("events.free") },
    { key: "featured", label: t("events.featured") },
  ]

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [selectedFilters, search, nearMe, hidePast, sortBy])

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const filterMatch = (event: any, key: string) => {
    const title = event.title?.toLowerCase() || ""
    if (key === "festival")
      return ["festival", "primavera", "sonar", "cruïlla", "mira", "beach festival"].some((w) => title.includes(w))
    if (key === "neighborhood")
      return ["festa major", "festes majors", "fiesta mayor", "la mercè", "grec"].some((w) => title.includes(w))
    if (key === "free") return event.price?.toLowerCase() === "gratis"
    if (key === "featured") return event.featured === true
    return false
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesFilters = selectedFilters.size === 0 || Array.from(selectedFilters).every((key) => filterMatch(event, key))

      const matchesSearch =
        search === "" ||
        event.title?.toLowerCase().includes(search.toLowerCase()) ||
        event.address?.toLowerCase().includes(search.toLowerCase()) ||
        event.description?.toLowerCase().includes(search.toLowerCase())

      const matchesNearMe =
        !nearMe ||
        !userLat ||
        !userLng ||
        (event.latitude && event.longitude && getDistance(userLat, userLng, event.latitude, event.longitude) <= 5)

      const matchesPast = !hidePast || !isEventPast(event.date)

      return matchesFilters && matchesSearch && matchesNearMe && matchesPast
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedFilters, search, nearMe, userLat, userLng, hidePast])

  const sortedEvents = useMemo(() => {
    const arr = [...filteredEvents]
    if (sortBy === "featured") {
      arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(a.date).getTime() - new Date(b.date).getTime())
    } else if (sortBy === "date_desc") {
      arr.reverse()
    }
    return arr
  }, [filteredEvents, sortBy])

  const visibleEvents = sortedEvents.slice(0, visibleCount)

  const activeFilters: { label: string; onRemove: () => void }[] = filters
    .filter((f) => selectedFilters.has(f.key))
    .map((f) => ({ label: f.label, onRemove: () => setSelectedFilters((s) => toggleInSet(s, f.key)) }))
  if (nearMe)
    activeFilters.push({
      label: "📍 Cerca de mí",
      onRemove: () => {
        setNearMe(false)
        setUserLat(null)
        setUserLng(null)
      },
    })
  if (hidePast) activeFilters.push({ label: "Solo próximos", onRemove: () => setHidePast(false) })
  if (search) activeFilters.push({ label: `"${search}"`, onRemove: () => setSearch("") })

  const clearAll = () => {
    setSelectedFilters(new Set())
    setSearch("")
    setNearMe(false)
    setUserLat(null)
    setUserLng(null)
    setHidePast(false)
  }

  const requestNearMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLat(pos.coords.latitude)
      setUserLng(pos.coords.longitude)
      setNearMe(true)
    })
  }

  return (
    <>
      <main className="relative min-h-screen pb-40 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-[float_18s_ease-in-out_infinite]" />
          <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[130px] animate-[float_22s_ease-in-out_infinite_reverse]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("events.title")}</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-white md:text-6xl">{t("events.subtitle")}</h1>
          </div>
        </section>

        {/* STICKY SEARCH + QUICK ACTIONS */}
        <div className="sticky top-0 z-30 mt-8 border-y border-white/10 bg-black/70 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4">
            <div className="group flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3.5 backdrop-blur-xl transition focus-within:border-purple-400/50 focus-within:bg-white/[0.08]">
              <span className="text-zinc-500 transition group-focus-within:text-purple-300">🔍</span>
              <input
                type="text"
                placeholder={t("events.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-500 transition hover:text-white" aria-label="Limpiar búsqueda">
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={nearMe ? () => { setNearMe(false); setUserLat(null); setUserLng(null) } : requestNearMe}
              className={`shrink-0 rounded-full px-4 py-3.5 text-sm font-bold transition ${
                nearMe ? "bg-purple-500 text-white" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              📍 Cerca
            </button>

            <button
              onClick={() => setHidePast(!hidePast)}
              className={`shrink-0 rounded-full px-4 py-3.5 text-sm font-bold transition ${
                hidePast ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              📅 Solo próximos
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-medium text-white outline-none"
            >
              <option value="date" className="bg-black">Próximos primero</option>
              <option value="date_desc" className="bg-black">Más lejanos primero</option>
              <option value="featured" className="bg-black">⭐ Destacados primero</option>
            </select>
          </div>

          <div className="mx-auto mt-3 flex max-w-7xl flex-wrap gap-2 px-4">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedFilters((s) => toggleInSet(s, f.key))}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedFilters.has(f.key)
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/[0.04] text-white hover:border-purple-400/30 hover:bg-white/[0.08]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {activeFilters.length > 0 && (
            <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-2 px-4">
              {activeFilters.map((f, i) => (
                <button
                  key={`${f.label}-${i}`}
                  onClick={f.onRemove}
                  className="flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-400/20"
                >
                  {f.label} <span className="text-purple-300">✕</span>
                </button>
              ))}
              <button onClick={clearAll} className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:text-white hover:underline">
                Limpiar todo
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        <section className="mx-auto max-w-7xl px-4 pt-8">
          <p className="text-sm text-zinc-500">
            {sortedEvents.length} {sortedEvents.length === 1 ? "evento encontrado" : "eventos encontrados"}
          </p>
        </section>

        {/* Results */}
        <section className="mx-auto mt-4 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <p className="text-lg font-bold text-zinc-300">No hay eventos con estos filtros</p>
              <p className="mt-2 text-sm text-zinc-500">Prueba a quitar algún filtro.</p>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearAll}
                  className="mt-6 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            visibleEvents.map((event, index) => {
              const past = isEventPast(event.date)
              const dateLabel = event.date
                ? new Date(event.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
                : ""
              return (
                <Reveal key={event.id} style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}>
                  <Link
                    href={`/event/${createSlug(event.title)}`}
                    className={`group block overflow-hidden rounded-[32px] border bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-purple-400/30 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.35)] ${
                      past ? "border-white/5 opacity-60" : "border-white/10"
                    }`}
                  >
                    <div className="relative h-[460px] overflow-hidden">
                      {event.image ? (
                        <Image src={event.image} alt={event.title} fill className="object-cover transition duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="absolute inset-0 bg-zinc-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                        {past && (
                          <div className="rounded-full border border-zinc-500/30 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-400 backdrop-blur-xl">
                            ⏹ Evento terminado
                          </div>
                        )}
                        {event.featured && !past && (
                          <div className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl">
                            ⭐ {t("events.featured")}
                          </div>
                        )}
                        {event.sold_out && !past && (
                          <div className="rounded-full border border-red-500/30 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-300 backdrop-blur-xl">
                            🚫 Sold out
                          </div>
                        )}
                        {event.vip_tables && !past && (
                          <div className="rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-300 backdrop-blur-xl">
                            🛋️ Mesa VIP
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-6">
                        {event.music && (
                          <p className="text-sm uppercase tracking-wide text-zinc-400">{event.music}</p>
                        )}
                        <h2 className="mt-2 text-4xl font-black tracking-tight text-white">{event.title}</h2>
                        {event.description && <p className="mt-3 text-zinc-300 line-clamp-2">{event.description}</p>}
                        <div className="mt-5 flex items-center justify-between text-sm text-zinc-300">
                          <span>📍 {event.club_name || "Barcelona"}</span>
                          <span>{past ? "Terminado" : dateLabel}</span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          {(event.start_time || event.end_time) && (
                            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">
                              🕒 {event.start_time}{event.end_time ? ` - ${event.end_time}` : ""}
                            </div>
                          )}
                          {event.price && (
                            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">
                              🎟 {event.price}
                            </div>
                          )}
                          {event.artist && (
                            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">
                              🎧 {event.artist}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )
            })
          )}
        </section>

        {visibleCount < sortedEvents.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-2xl border border-white/15 bg-white/[0.03] px-8 py-4 font-bold text-white transition hover:bg-white hover:text-black"
            >
              Mostrar más ({sortedEvents.length - visibleCount} más)
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -20px) scale(1.08);
          }
        }
      `}</style>
    </>
  )
}