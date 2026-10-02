"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import { createSlug } from "../../lib/slug"
import { SearchIcon, CloseIcon, LocationIcon, CalendarIcon, ChevronDownIcon } from "../ui/FilterIcons"

// Un evento de varios días (date_end) no se considera terminado hasta que pasa el último día,
// no el primero.
const isEventPast = (date: string, dateEnd?: string | null): boolean => {
  if (!date) return false
  const eventDate = new Date(dateEnd || date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return eventDate < now
}

// "Próximamente": el evento cae dentro de los próximos 7 días (incluyendo hoy), pero no es hoy
// mismo (eso ya se nota por la fecha) ni ya ha pasado.
const isUpcomingSoon = (date: string): boolean => {
  if (!date) return false
  const eventDate = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const inOneWeek = new Date(now)
  inOneWeek.setDate(inOneWeek.getDate() + 7)
  return eventDate >= now && eventDate <= inOneWeek
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
  const [nearMeLoading, setNearMeLoading] = useState(false)
  const [nearMeError, setNearMeError] = useState("")
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

      const matchesPast = !hidePast || !isEventPast(event.date, event.date_end)

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
      label: "Cerca de mí",
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

  // Mismo arreglo que en ClubsExplorer: sin callback de error ni loading, el botón "Cerca"
  // parecía no hacer nada si el móvil denegaba el permiso o tardaba en conseguir el GPS.
  const requestNearMe = () => {
    setNearMeError("")
    if (!navigator.geolocation) {
      setNearMeError("Tu navegador no permite compartir ubicación.")
      return
    }
    setNearMeLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setNearMe(true)
        setNearMeLoading(false)
      },
      (err) => {
        setNearMeLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setNearMeError("Necesitamos tu ubicación — revisa los permisos de ubicación de tu navegador para esta web.")
        } else if (err.code === err.TIMEOUT) {
          setNearMeError("No hemos podido obtener tu ubicación a tiempo. Inténtalo de nuevo.")
        } else {
          setNearMeError("No hemos podido obtener tu ubicación. Inténtalo de nuevo.")
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
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
            {/* text-5xl fijo se salía de un móvil de 375px con la fuente display nueva — igual
                que el titular de la home (ver HomeClient.tsx). break-words + tamaño menor en
                mobile. */}
            <h1 className="font-display mt-4 break-words text-4xl font-black leading-[1.05] text-white sm:text-5xl md:text-6xl">{t("events.subtitle")}</h1>
          </div>
        </section>

        {/* STICKY SEARCH + QUICK ACTIONS */}
        <div className="sticky top-0 z-30 mt-8 border-y border-white/10 bg-black/70 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4">
            <div className="group flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3.5 backdrop-blur-xl transition focus-within:border-purple-400/50 focus-within:bg-white/[0.08]">
              <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500 transition group-focus-within:text-purple-300" />
              <input
                type="text"
                placeholder={t("events.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-500 transition hover:text-white" aria-label="Limpiar búsqueda">
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={nearMe ? () => { setNearMe(false); setUserLat(null); setUserLng(null) } : requestNearMe}
              disabled={nearMeLoading}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-3.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60 ${
                nearMe ? "shadow-[0_6px_20px_-4px_rgba(168,85,247,0.55)]" : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
              style={nearMe ? { background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" } : undefined}
            >
              <LocationIcon className="h-4 w-4" />
              {nearMeLoading ? "Localizando..." : "Cerca"}
            </button>

            <button
              onClick={() => setHidePast(!hidePast)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-3.5 text-sm font-bold text-white transition active:scale-95 ${
                hidePast ? "shadow-[0_6px_20px_-4px_rgba(168,85,247,0.55)]" : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
              style={hidePast ? { background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" } : undefined}
            >
              <CalendarIcon className="h-4 w-4" />
              Solo próximos
            </button>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none rounded-full border border-white/10 bg-white/[0.04] py-3.5 pl-4 pr-9 text-sm font-medium text-white outline-none"
              >
                <option value="date" className="bg-black">Próximos primero</option>
                <option value="date_desc" className="bg-black">Más lejanos primero</option>
                <option value="featured" className="bg-black">Destacados primero</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>

          <div className="mx-auto mt-3 flex max-w-7xl flex-wrap gap-2 px-4">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedFilters((s) => toggleInSet(s, f.key))}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  selectedFilters.has(f.key)
                    ? "text-white shadow-[0_6px_20px_-4px_rgba(168,85,247,0.55)]"
                    : "border border-white/10 bg-white/[0.04] text-white hover:border-purple-400/30 hover:bg-white/[0.08]"
                }`}
                style={selectedFilters.has(f.key) ? { background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>

          {nearMeError && (
            <p className="mx-auto mt-3 max-w-7xl px-4 text-xs font-semibold text-red-400">⚠️ {nearMeError}</p>
          )}

          {activeFilters.length > 0 && (
            <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-2 px-4">
              {activeFilters.map((f, i) => (
                <button
                  key={`${f.label}-${i}`}
                  onClick={f.onRemove}
                  className="flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-400/20"
                >
                  {f.label} <CloseIcon className="h-3 w-3 text-purple-300" />
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
              const past = isEventPast(event.date, event.date_end)
              const upcomingSoon = !past && isUpcomingSoon(event.date)
              const dateLabel = event.date
                ? new Date(event.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
                : ""
              // Si tiene date_end distinto de date, es un evento de varios días -> se muestra
              // como rango en vez de un solo día.
              const dateEndLabel =
                event.date_end && event.date_end !== event.date
                  ? new Date(event.date_end).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                  : null
              return (
                <Reveal key={event.id} style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}>
                  {/* Antes era una tarjeta más (imagen + franja de chips abajo), igual que las de
                      club — cualquier entrada se parecía a cualquier otra cosa de la app. Ahora
                      tiene forma de entrada real: póster arriba, y debajo un talón separado por
                      una línea perforada con muescas (los dos círculos -top-3, del color de fondo
                      de la página, simulan el troquelado de una entrada física). Los datos
                      prácticos — fecha, hora, precio — viven en el talón, no sobre la foto. */}
                  <Link
                    href={`/event/${createSlug(event.title)}`}
                    className={`group block overflow-hidden rounded-[28px] border bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-purple-400/30 hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.35)] ${
                      past ? "border-white/5 opacity-60" : "border-white/10"
                    }`}
                  >
                    <div className="relative h-[380px] overflow-hidden">
                      {event.image ? (
                        <Image
                          src={event.image}
                          alt={event.title}
                          fill
                          className="object-cover transition duration-700 group-hover:scale-110"
                        />
                      ) : (
                        // Antes caía en el fallback fijo "/clubs/razz.jpg" (archivo inexistente,
                        // 404, y compartido con otros clubs/eventos). Ahora, sin foto propia, un
                        // degradado neutro en vez de la imagen de otro club.
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/60 via-black to-black">
                          <span className="text-6xl opacity-30">🎉</span>
                        </div>
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
                        {upcomingSoon && (
                          <div className="rounded-full border border-purple-400/30 bg-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-200 backdrop-blur-xl">
                            🔜 Próximamente
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
                      </div>
                    </div>

                    {/* Talón de la entrada */}
                    <div className="relative border-t border-dashed border-white/20 bg-black/40 px-6 py-5">
                      <span aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#050505]" />
                      <span aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#050505]" />
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {past ? "Terminado" : dateEndLabel ? `${dateLabel} - ${dateEndLabel}` : dateLabel}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            📍 {event.club_name || "Barcelona"}
                            {event.artist ? ` · 🎧 ${event.artist}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {(event.start_time || event.end_time) && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                              {event.start_time}{event.end_time ? `-${event.end_time}` : ""}
                            </span>
                          )}
                          {event.price && (
                            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">
                              {event.price}
                            </span>
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
