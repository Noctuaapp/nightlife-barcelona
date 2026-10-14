"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { createSlug } from "../../lib/slug"
import { useGeolocation } from "../../lib/useGeolocation"
import { distanceInMeters, formatDistance } from "../../lib/geo"

type Event = {
  id: number
  title: string
  club_id: number | null
  club_name: string | null
  artist: string | null
  music: string | null
  date: string | null
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
}

// "Pr\u00f3ximamente": el evento cae dentro de los pr\u00f3ximos 7 d\u00edas (incluyendo hoy).
const isUpcomingSoon = (date: string | null): boolean => {
  if (!date) return false
  const eventDate = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const inOneWeek = new Date(now)
  inOneWeek.setDate(inOneWeek.getDate() + 7)
  return eventDate >= now && eventDate <= inOneWeek
}

export default function EventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const { t, locale } = useLanguage()
  const router = useRouter()
  const geo = useGeolocation()

  const categories = [
    { key: "All", label: t("filters.all") },
    { key: "Tonight", label: t("events.tonight") },
    { key: "Featured", label: t("events.featured") },
    { key: "Free", label: "Gratis" },
    { key: "Near", label: "📍 Cerca de mí" },
    { key: "Sold out", label: t("events.sold_out") },
  ]

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true })
      if (data) setEvents(data)
    }
    fetchEvents()
  }, [])

  // Fecha de hoy en Madrid (antes era la fecha UTC, que entre las 00:00 y las 02:00 aún es "ayer").
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
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
  const hasLiveTonight = events.some((event) => event.date === today)

  const distTo = (e: Event): number | null =>
    geo.pos && e.latitude && e.longitude ? distanceInMeters(geo.pos.lat, geo.pos.lng, Number(e.latitude), Number(e.longitude)) : null

  const selectCategory = (key: string) => {
    setSelectedCategory(key)
    if (key === "Near" && !geo.pos && !geo.locating) geo.request()
  }

  const filteredEvents = (() => {
    const upcoming = (e: Event) => !e.date || e.date >= today
    if (selectedCategory === "Near") {
      // Los próximos eventos, del más cercano al más lejano. Sin ubicación aún, por fecha.
      const list = events.filter(upcoming)
      if (!geo.pos) return list.slice(0, 3)
      return list
        .filter((e) => distTo(e) !== null)
        .sort((a, b) => (distTo(a) as number) - (distTo(b) as number))
        .slice(0, 3)
    }
    // "Todos": antes eran los destacados aunque ya hubieran pasado o no tuvieran fecha (en octubre
    // salían Sant Joan y un festival de julio bajo "Qué está pasando"). Ahora solo eventos con
    // fecha de hoy en adelante: primero los destacados y después los más cercanos en el tiempo.
    if (selectedCategory === "All") {
      const next = events.filter((e) => !!e.date && e.date >= today)
      return [...next.filter((e) => e.featured), ...next.filter((e) => !e.featured)].slice(0, 3)
    }
    return events
      .filter((event) => {
        if (selectedCategory === "Tonight") return event.date === today
        if (selectedCategory === "Featured") return event.featured === true && upcoming(event)
        if (selectedCategory === "Free") return upcoming(event) && (event.price || "").toLowerCase().includes("gratis")
        if (selectedCategory === "Sold out") return event.sold_out === true && upcoming(event)
        return true
      })
      .slice(0, 3)
  })()

  return (
    <section className="mx-auto mt-28 max-w-7xl px-4">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("events.live")}</p>
          <h2 className="mt-4 text-5xl font-black tracking-tight text-white">
            {t("events.happening")}
          </h2>
        </div>
        {hasLiveTonight && (
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {t("events.tonight")}
          </div>
        )}
      </div>

      <div className="mt-12 flex gap-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => selectCategory(category.key)}
            className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === category.key
                ? "bg-white text-black"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {selectedCategory === "Near" && (geo.locating || geo.error || geo.pos) && (
        <p className={`mt-4 text-sm ${geo.error ? "text-amber-300" : "text-zinc-400"}`}>
          {geo.locating ? "Localizando…" : geo.error ? geo.error : "📍 Los más cercanos a tu ubicación"}
        </p>
      )}

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.length === 0 ? (
          <p className="col-span-3 text-center text-zinc-500 py-10">No hay eventos próximos con este filtro.</p>
        ) : (
          filteredEvents.map((event, index) => (
            // Misma forma de entrada que en /events (ver EventsExplorer.tsx): póster arriba,
            // talón perforado abajo con los datos prácticos — para que un evento se reconozca
            // como evento desde el primer vistazo, lo veas donde lo veas en la app.
            <Link
              href={`/event/${createSlug(event.title)}`}
              key={event.id}
              className="group block overflow-hidden rounded-[26px] border border-white/10 bg-black transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="relative h-[340px] overflow-hidden">
                {event.image ? (
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-110"
                  />
                ) : (
                  // Antes caía en el fallback fijo "/clubs/razz.jpg" (archivo inexistente, 404,
                  // compartido con otros clubs/eventos). Ahora, sin foto propia, un degradado
                  // neutro en vez de la imagen de otro local.
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/60 via-black to-black">
                    <span className="text-6xl opacity-30">🎉</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  {event.featured && (
                    <div className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl">
                      🔥 {t("events.featured")}
                    </div>
                  )}
                  {event.sold_out && (
                    <div className="rounded-full border border-red-500/20 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 backdrop-blur-xl">
                      🚫 {t("events.sold_out")}
                    </div>
                  )}
                  {isUpcomingSoon(event.date) && (
                    <div className="rounded-full border border-purple-400/30 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-200 backdrop-blur-xl">
                      🔜 Próximamente
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/map?type=events&id=${event.id}`)
                    }}
                    className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl transition hover:scale-105 hover:bg-white/20"
                  >
                    🗺️ Ver en mapa
                  </button>
                </div>

                <div className="absolute right-5 top-5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 backdrop-blur-xl">
                  {event.date === today ? t("events.tonight") : formatEventDate(event.date)}
                  {selectedCategory === "Near" && distTo(event) !== null ? ` · ${formatDistance(distTo(event) as number)}` : ""}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{event.description}</p>
                  )}
                </div>
              </div>

              {/* Talón de la entrada */}
              <div className="relative border-t border-dashed border-white/20 bg-black/40 px-6 py-5">
                <span aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#050505]" />
                <span aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#050505]" />
                <div className="flex items-center justify-between gap-3 text-sm text-zinc-300">
                  {event.start_time && <span>🕒 {event.start_time}</span>}
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">
                    {event.price || "TBA"}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/events"
          className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
        >
          {t("events.see_all")}
        </Link>
      </div>
    </section>
  )
}