"use client"

import { zoneOf, zonesPresent } from "../../lib/zones"
import { useEffect, useMemo, useState } from "react"
import { track } from "../../lib/track"
import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import { createSlug } from "../../lib/slug"
import { SearchIcon, CloseIcon, LocationIcon, CalendarIcon, ChevronDownIcon } from "../ui/FilterIcons"
import ExploreSwitch from "./ExploreSwitch"
import Icon from "../ui/Icon"
import { toDateLocale } from "../../lib/dateLocale"

// Un evento de varios días (date_end) no se considera terminado hasta que pasa el último día,
// no el primero.
// "2026-11-14" se lee a mediodía para que ninguna zona horaria lo mueva de día.
const dateOnly = (value: string) => new Date(value.length <= 10 ? `${value}T12:00:00` : value)

const isEventPast = (date: string, dateEnd?: string | null): boolean => {
  if (!date) return false
  const eventDate = dateOnly(dateEnd || date)
  eventDate.setHours(23, 59, 59, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return eventDate < now
}

// "Próximamente": el evento cae dentro de los próximos 7 días (incluyendo hoy), pero no es hoy
// mismo (eso ya se nota por la fecha) ni ya ha pasado.
const isUpcomingSoon = (date: string): boolean => {
  if (!date) return false
  const eventDate = dateOnly(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const inOneWeek = new Date(now)
  inOneWeek.setDate(inOneWeek.getDate() + 7)
  return eventDate >= now && eventDate <= inOneWeek
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const PAGE_SIZE = 9

// Búsqueda sin tildes ni mayúsculas y con puntuación de relevancia (ver ClubsExplorer): el
// título exacto primero, luego los que empiezan por la búsqueda, luego una palabra que empieza
// así, luego contiene en el título, y por último dirección y descripción.
const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()

function searchScore(event: any, rawQuery: string): number {
  const q = norm(rawQuery)
  if (!q) return 1
  const title = norm(event.title)
  const address = norm(event.address)
  const desc = norm(event.description)
  const short = q.length < 3
  if (title === q) return 100
  if (title.startsWith(q)) return 80
  if (title.split(" ").some((w) => w.startsWith(q))) return 60
  if (!short && title.includes(q)) return 40
  if (address.split(" ").some((w) => w.startsWith(q))) return 20
  if (!short && address.includes(q)) return 15
  if (!short && desc.includes(q)) return 5
  return 0
}

export default function EventsExplorer({ initialEvents }: { initialEvents: any[] }) {
  const [events] = useState<any[]>(initialEvents)
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [nearMe, setNearMe] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [nearMeLoading, setNearMeLoading] = useState(false)
  const [nearMeError, setNearMeError] = useState("")
  // Los eventos pasados se ocultan por defecto (antes salían mezclados, solo atenuados).
  // Como antes: se ven todos los eventos (los pasados, atenuados) y "Solo próximos" los filtra.
  const [hidePast, setHidePast] = useState(false)
  const [sortBy, setSortBy] = useState<"date" | "date_desc" | "featured">("date")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { t, locale } = useLanguage()

  const availableZones = zonesPresent(events)

  const filters = [
    { key: "festival", label: t("events.festival") },
    { key: "neighborhood", label: t("events.neighborhood") },
    { key: "free", label: t("events.free") },
    { key: "featured", label: t("events.featured") },
  ]

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [selectedFilters, selectedZones, search, nearMe, hidePast, sortBy])

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

      const matchesSearch = searchScore(event, search) > 0

      const matchesNearMe =
        !nearMe ||
        !userLat ||
        !userLng ||
        (event.latitude && event.longitude && getDistance(userLat, userLng, event.latitude, event.longitude) <= 5)

      const matchesPast = !hidePast || !isEventPast(event.date, event.date_end)

      const matchesZone = selectedZones.size === 0 || selectedZones.has(zoneOf(event))

      return matchesFilters && matchesZone && matchesSearch && matchesNearMe && matchesPast
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedFilters, selectedZones, search, nearMe, userLat, userLng, hidePast])

  const sortedEvents = useMemo(() => {
    const arr = [...filteredEvents]
    if (search.trim() && sortBy === "date") {
      // Con búsqueda activa y orden por defecto: primero lo más relevante, y a igual relevancia, por fecha.
      arr.sort((a, b) => searchScore(b, search) - searchScore(a, search) || new Date(a.date).getTime() - new Date(b.date).getTime())
      return arr
    }
    if (sortBy === "featured") {
      arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || new Date(a.date).getTime() - new Date(b.date).getTime())
    } else if (sortBy === "date_desc") {
      arr.reverse()
    }
    return arr
  }, [filteredEvents, sortBy, search])

  const visibleEvents = sortedEvents.slice(0, visibleCount)

  // Analítica de búsquedas del listado: qué se busca y cuántos resultados da (0 = demanda sin cubrir).
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) return
    const timeout = setTimeout(() => {
      track("search", { itemType: "event", itemName: q.toLowerCase().slice(0, 80), resultsCount: sortedEvents.length })
    }, 1500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const activeFilters: { label: string; onRemove: () => void }[] = filters
    .filter((f) => selectedFilters.has(f.key))
    .map((f) => ({ label: f.label, onRemove: () => setSelectedFilters((s) => toggleInSet(s, f.key)) }))
  selectedZones.forEach((z) => activeFilters.push({ label: z, onRemove: () => setSelectedZones((s) => toggleInSet(s, z)) }))
  if (nearMe)
    activeFilters.push({
      label: t("explorer.near"),
      onRemove: () => {
        setNearMe(false)
        setUserLat(null)
        setUserLng(null)
      },
    })
  if (hidePast) activeFilters.push({ label: t("eventsExplorer.onlyUpcoming"), onRemove: () => setHidePast(false) })
  if (search) activeFilters.push({ label: `"${search}"`, onRemove: () => setSearch("") })

  const clearAll = () => {
    setSelectedFilters(new Set())
    setSelectedZones(new Set())
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
      setNearMeError(t("geo.unsupported"))
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
        if (err.code === err.PERMISSION_DENIED) setNearMeError(t("geo.denied"))
        else if (err.code === err.TIMEOUT) setNearMeError(t("geo.timeout"))
        else setNearMeError(t("geo.error"))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const quick = (active: boolean) =>
    `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
      active ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
    }`

  return (
    <>
      <main className="relative min-h-screen bg-night pb-40 text-ink">

        <section className="px-4 pt-8 sm:pt-12">
          <div className="mx-auto max-w-7xl">
            <ExploreSwitch active="events" />
            <h1 className="font-display mt-6 break-words text-[2rem] leading-[1.06] text-ink sm:text-5xl md:text-6xl">{t("events.subtitle")}</h1>
          </div>
        </section>

        <div className="sticky top-[72px] z-30 sm:top-20 mt-6 border-y border-white/10 bg-night/90 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 lg:flex-row lg:items-center">
            <div className="group flex min-w-0 flex-1 items-center gap-3 rounded-full border border-white/15 bg-surface px-5 py-3 transition focus-within:border-brand">
              <SearchIcon className="h-5 w-5 shrink-0 text-zinc-400 transition group-focus-within:text-brand-soft" />
              <input
                type="search"
                placeholder={t("events.search")}
                aria-label={t("events.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-base text-ink outline-none focus-visible:outline-none placeholder:text-zinc-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-400 transition hover:text-ink" aria-label={t("explorer.clearSearch")}>
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0">
              <button
                onClick={nearMe ? () => { setNearMe(false); setUserLat(null); setUserLng(null) } : requestNearMe}
                disabled={nearMeLoading}
                aria-pressed={nearMe}
                className={quick(nearMe)}
              >
                <LocationIcon className="h-4 w-4" />
                {nearMeLoading ? t("explorer.locating") : t("explorer.near")}
              </button>
              {filters.map((f) => (
                <button key={f.key} onClick={() => setSelectedFilters((s) => toggleInSet(s, f.key))} aria-pressed={selectedFilters.has(f.key)} className={quick(selectedFilters.has(f.key))}>
                  {f.label}
                </button>
              ))}
              <button onClick={() => setHidePast(!hidePast)} aria-pressed={hidePast} className={quick(hidePast)}>
                <CalendarIcon className="h-4 w-4" />
                {t("eventsExplorer.onlyUpcoming")}
              </button>
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label={t("explorer.sortLabel")}
                  className="appearance-none rounded-full border border-white/10 bg-night py-2.5 pl-4 pr-9 text-sm font-semibold text-zinc-200 outline-none"
                >
                  <option value="date">{t("eventsExplorer.sortDate")}</option>
                  <option value="date_desc">{t("eventsExplorer.sortDateDesc")}</option>
                  <option value="featured">{t("eventsExplorer.sortFeatured")}</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
              {availableZones.length > 1 &&
                availableZones.map((z) => (
                  <button key={z} onClick={() => setSelectedZones((s) => toggleInSet(s, z))} aria-pressed={selectedZones.has(z)} className={quick(selectedZones.has(z))}>
                    {z}
                  </button>
                ))}
            </div>
          </div>

          {nearMeError && <p className="mx-auto mt-3 max-w-7xl px-4 text-sm font-semibold text-red-300">{nearMeError}</p>}

          {activeFilters.length > 0 && (
            <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-2 px-4">
              {activeFilters.map((f, i) => (
                <button
                  key={`${f.label}-${i}`}
                  onClick={f.onRemove}
                  className="flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand-soft transition hover:bg-brand/25"
                >
                  {f.label} <CloseIcon className="h-3 w-3" />
                </button>
              ))}
              <button onClick={clearAll} className="text-xs font-semibold text-zinc-400 underline-offset-2 hover:text-ink hover:underline">
                {t("explorer.clearAll")}
              </button>
            </div>
          )}
        </div>

        <section className="mx-auto max-w-7xl px-4 pt-6">
          <p className="text-sm text-zinc-400" aria-live="polite">
            {(sortedEvents.length === 1 ? t("eventsExplorer.countOne") : t("eventsExplorer.countMany")).replace("{n}", String(sortedEvents.length))}
          </p>
        </section>

        <section className="mx-auto mt-4 grid max-w-7xl gap-5 px-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEvents.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-lg font-semibold text-zinc-200">{t("eventsExplorer.emptyTitle")}</p>
              <p className="mt-2 text-sm text-zinc-400">{t("eventsExplorer.emptyBody")}</p>
              {activeFilters.length > 0 && (
                <button onClick={clearAll} className="mt-6 rounded-ctl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/10">
                  {t("explorer.clearFilters")}
                </button>
              )}
            </div>
          ) : (
            visibleEvents.map((event) => {
              const past = isEventPast(event.date, event.date_end)
              const soon = !past && isUpcomingSoon(event.date)
              const fmt = (d: string) => dateOnly(d).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" })
              const dateLabel = event.date
                ? event.date_end && event.date_end !== event.date
                  ? `${fmt(event.date)} – ${fmt(event.date_end)}`
                  : fmt(event.date)
                : t("eventPage.dateTbc")
              return (
                // Tarjeta compacta con el mismo esquema que la de club (antes medía 500 px, con
                // emojis en cada etiqueta y un "talón" de entrada decorativo).
                <Link
                  key={event.id}
                  href={`/event/${event.slug || createSlug(event.title)}`}
                  className={`group block overflow-hidden rounded-card border bg-surface transition hover:border-white/25 ${past ? "border-white/5 opacity-60" : "border-white/10"}`}
                >
                  <div className="relative h-48 overflow-hidden">
                    {event.image ? (
                      <Image src={event.image} alt={event.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/30 via-surface to-night">
                        <Icon name="calendar" className="h-12 w-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-night/80 px-2.5 py-1 text-xs font-semibold text-ink">{past ? t("event.finishedValue") : dateLabel}</span>
                      {soon && <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white">{t("eventsExplorer.thisWeek")}</span>}
                      {event.sold_out && !past && <span className="rounded-full bg-red-500/80 px-2.5 py-1 text-xs font-semibold text-white">{t("event.soldOut")}</span>}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 text-lg font-semibold leading-snug text-ink">
                        {event.title}
                        {event.featured && !past && <Icon name="star" className="ml-1.5 inline h-4 w-4 align-[-2px] text-warn" />}
                      </h2>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-400">
                      {[event.club_name || "Barcelona", event.music].filter(Boolean).join(" · ")}
                    </p>
                    {(event.start_time || event.price) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {event.start_time && (
                          <span className="rounded-full border border-white/10 px-2.5 py-1 font-semibold text-zinc-200">
                            {event.start_time}
                            {event.end_time ? ` – ${event.end_time}` : ""}
                          </span>
                        )}
                        {event.price && <span className="rounded-full border border-white/10 px-2.5 py-1 font-semibold text-zinc-200">{event.price}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </section>

        {visibleCount < sortedEvents.length && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-ctl border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              {t("explorer.showMore").replace("{n}", String(Math.min(PAGE_SIZE, sortedEvents.length - visibleCount)))}
            </button>
          </div>
        )}
      </main>
    </>
  )
}
