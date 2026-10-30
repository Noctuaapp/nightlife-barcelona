"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../ui/SafeImage" // <Image> que nunca deja una foto rota
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { createSlug } from "../../lib/slug"
import { useGeolocation } from "../../lib/useGeolocation"
import { distanceInMeters, formatDistance } from "../../lib/geo"
import Icon from "../ui/Icon"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"
import { eventHappensOn, eventInHomeWindow, nightDateMadrid } from "../../lib/homeEvents"

type Event = {
  id: number
  title: string
  club_id: number | null
  club_name: string | null
  artist: string | null
  music: string | null
  date: string | null
  // Solo la tabla events lo tiene (eventos de varios días); club_events no.
  date_end?: string | null
  start_time: string | null
  end_time: string | null
  price: string | null
  ticket_url: string | null
  image: string | null
  description: string | null
  featured: boolean | null
  sold_out: boolean | null
  latitude: number | null
  longitude: number | null
  // "event": fichas de /events (tabla events). "club_event": noches sueltas que publica un club
  // desde /mi-club (tabla club_events, sin tabla de hidden ni coordenadas propias — por eso antes
  // nunca aparecían aquí: esta sección solo miraba "events"). Determina a qué ruta enlaza la
  // tarjeta y si se puede ver en el mapa (club_events no tiene lat/lng propia).
  kind: "event" | "club_event"
}

export default function EventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const { t, locale } = useLanguage()
  const router = useRouter()
  const geo = useGeolocation()

  // Sin el filtro "Agotado": no ayuda a decidir a qué ir.
  // "Esta noche" se quitó: si esa noche no había ningún evento el filtro se quedaba vacío. En su
  // lugar, "Próximos" enseña siempre los eventos más cercanos en el tiempo (haya algo hoy o no).
  const categories = [
    { key: "All", label: t("filters.all") },
    { key: "Upcoming", label: t("events.upcoming") },
    { key: "Featured", label: t("events.featured") },
    { key: "Free", label: t("events.free") },
    { key: "Near", label: t("home.tabNear") },
  ]

  useEffect(() => {
    const fetchEvents = async () => {
      // "Qué está pasando" solo miraba la tabla events: las noches sueltas que publica cada club
      // desde /mi-club (tabla club_events) nunca aparecían aquí aunque fueran justo lo que está
      // pasando esta noche. club_events no tiene columna "hidden" (nada la filtra en ningún sitio
      // del código) ni lat/lng propia, así que esas se añaden sin coordenadas: no entran en el
      // filtro "Cerca" pero sí en el resto.
      const [eventsRes, clubEventsRes] = await Promise.all([
        // Eventos oculto (lib/featureFlags.ts): solo se enseñan las noches de club.
        EVENTS_HIDDEN ? Promise.resolve({ data: [] as any[] }) : supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true }),
        supabase.from("club_events").select("*").order("date", { ascending: true }),
      ])
      const fromEvents: Event[] = (eventsRes.data || []).map((e) => ({ ...e, kind: "event" }))
      const fromClubEvents: Event[] = (clubEventsRes.data || []).map((ce) => ({
        ...ce,
        latitude: null,
        longitude: null,
        kind: "club_event",
      }))
      const merged = [...fromEvents, ...fromClubEvents].sort((a, b) => {
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date.localeCompare(b.date)
      })
      setEvents(merged)
    }
    fetchEvents()
  }, [])

  // La noche en curso en Madrid (antes era la fecha UTC, que entre las 00:00 y las 02:00 aún es "ayer").
  // Hasta las 6:00 sigue siendo la noche de ayer: a las 2:00 del sábado la fiesta del viernes sigue.
  const today = nightDateMadrid()
  // "2026-11-14" → "sáb, 14 nov" en el idioma activo (antes se mostraba la fecha en bruto).
  const formatEventDate = (date: string | null) => {
    if (!date) return ""
    const d = new Date(date + "T12:00:00")
    if (Number.isNaN(d.getTime())) return date
    return d.toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" })
  }
  // Antes esta insignia "● Eventos en directo" se mostraba siempre, aunque no hubiera ningún
  // evento esta noche — dando a entender que algo está pasando ahora mismo cuando no es así.
  // Ahora solo aparece cuando de verdad hay un evento con fecha de hoy.
  const hasLiveTonight = events.some((event) => eventHappensOn(event.date, event.date_end, today))

  const distTo = (e: Event): number | null =>
    geo.pos && e.latitude && e.longitude ? distanceInMeters(geo.pos.lat, geo.pos.lng, Number(e.latitude), Number(e.longitude)) : null

  const selectCategory = (key: string) => {
    setSelectedCategory(key)
    if (key === "Near" && !geo.pos && !geo.locating) geo.request()
  }

  // «Qué está pasando» enseña solo lo de hoy y los 2 días siguientes (30/10/2026). Antes eran todos
  // los eventos de hoy en adelante: salía un festival de dentro de un mes bajo «Qué está pasando».
  // Un evento de varios días entra mientras alguno de sus días caiga en esa ventana; sin fecha no
  // entra (no se puede saber si está pasando). Los eventos vienen ya ordenados por fecha.
  const filteredEvents = (() => {
    const soon = events.filter((e) => eventInHomeWindow(e.date, e.date_end, today))
    if (selectedCategory === "Near") {
      // Del más cercano al más lejano. Sin ubicación aún, por fecha.
      if (!geo.pos) return soon.slice(0, 3)
      return soon
        .filter((e) => distTo(e) !== null)
        .sort((a, b) => (distTo(a) as number) - (distTo(b) as number))
        .slice(0, 3)
    }
    // "Todos": primero los destacados y después los más cercanos en el tiempo.
    if (selectedCategory === "All") return [...soon.filter((e) => e.featured), ...soon.filter((e) => !e.featured)].slice(0, 3)
    // "Próximos": cronológico puro (sin priorizar destacados).
    if (selectedCategory === "Upcoming") return soon.slice(0, 3)
    return soon
      .filter((event) => {
        if (selectedCategory === "Featured") return event.featured === true
        if (selectedCategory === "Free") return (event.price || "").toLowerCase().includes("gratis")
        return true
      })
      .slice(0, 3)
  })()

  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6" aria-labelledby="events-title">
      <div className="flex items-end justify-between gap-4">
        <h2 id="events-title" className="font-display text-3xl sm:text-4xl">
          {t("events.happening")}
        </h2>
        {hasLiveTonight && (
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-open">
            <span className="live-dot h-2 w-2 rounded-full bg-open" /> {t("events.tonight")}
          </span>
        )}
      </div>

      <div role="tablist" className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {categories.map((category) => (
          <button
            key={category.key}
            role="tab"
            aria-selected={selectedCategory === category.key}
            onClick={() => selectCategory(category.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedCategory === category.key ? "bg-ink text-night" : "border border-white/10 text-zinc-300 hover:bg-white/5"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {selectedCategory === "Near" && (geo.locating || geo.error) && (
        <p className={`mt-4 text-sm ${geo.error ? "text-warn" : "text-zinc-400"}`}>{geo.locating ? t("home.locating") : geo.error}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.length === 0 ? (
          <p className="col-span-full py-10 text-center text-zinc-400">{t("homeEvents.empty")}</p>
        ) : (
          filteredEvents.map((event) => (
            <Link
              href={
                event.kind === "club_event"
                  ? `/club-event/${event.id}`
                  : `/event/${(event as Event & { slug?: string }).slug || createSlug(event.title)}`
              }
              key={`${event.kind}-${event.id}`}
              className="group block overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25"
            >
              <div className="relative h-52 overflow-hidden">
                {event.image ? (
                  <Image src={event.image} alt={event.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-2" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  {event.date && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${eventHappensOn(event.date, event.date_end, today) ? "bg-open text-night" : "bg-night/80 text-ink"}`}>
                      {eventHappensOn(event.date, event.date_end, today) ? t("events.tonight") : formatEventDate(event.date)}
                    </span>
                  )}
                  {event.sold_out && <span className="rounded-full bg-red-400/90 px-3 py-1 text-xs font-semibold text-night">{t("events.sold_out")}</span>}
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-ink">{event.title}</h3>
                <p className="mt-1 truncate text-sm text-zinc-400">
                  {[event.club_name, event.start_time, selectedCategory === "Near" && distTo(event) !== null ? formatDistance(distTo(event) as number) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{event.price || ""}</span>
                  {/* Las noches de club (club_events) no tienen coordenadas propias y /map no las
                      soporta todavía, así que para esas se omite el botón en vez de llevar a un mapa
                      que no las va a encontrar. */}
                  {event.kind !== "club_event" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        router.push(`/map?type=events&id=${event.id}`)
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-ink"
                    >
                      <Icon name="map" className="h-3.5 w-3.5" /> {t("homeEvents.onMap")}
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {!EVENTS_HIDDEN && (
        <div className="mt-8 text-center">
          <Link href="/events" className="inline-flex items-center gap-2 rounded-ctl border border-white/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/5">
            {t("homeEvents.seeAll")} <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
