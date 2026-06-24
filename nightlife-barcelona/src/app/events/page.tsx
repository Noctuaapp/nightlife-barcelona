"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
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

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [nearMe, setNearMe] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const { t } = useLanguage()

  const filters = [
    { key: "all", label: t("filters.all") },
    { key: "festival", label: t("events.festival") },
    { key: "neighborhood", label: t("events.neighborhood") },
    { key: "free", label: t("events.free") },
    { key: "featured", label: t("events.featured") },
  ]

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true })
      if (data) setEvents(data)
      setLoading(false)
    }
    fetchEvents()
  }, [])

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const filteredEvents = events.filter((event) => {
    const allLabel = t("filters.all")
    const festivalLabel = t("events.festival")
    const neighborhoodLabel = t("events.neighborhood")
    const freeLabel = t("events.free")
    const featuredLabel = t("events.featured")

    const matchesFilter =
      selectedFilter === allLabel ||
      selectedFilter === "All" ||
      (selectedFilter === featuredLabel && event.featured === true) ||
      (selectedFilter === freeLabel && event.price?.toLowerCase() === "gratis") ||
      (selectedFilter === festivalLabel && (
        event.title?.toLowerCase().includes("festival") ||
        event.title?.toLowerCase().includes("primavera") ||
        event.title?.toLowerCase().includes("sonar") ||
        event.title?.toLowerCase().includes("cruïlla") ||
        event.title?.toLowerCase().includes("mira") ||
        event.title?.toLowerCase().includes("beach festival")
      )) ||
      (selectedFilter === neighborhoodLabel && (
        event.title?.toLowerCase().includes("festa major") ||
        event.title?.toLowerCase().includes("festes majors") ||
        event.title?.toLowerCase().includes("fiesta mayor") ||
        event.title?.toLowerCase().includes("la mercè") ||
        event.title?.toLowerCase().includes("grec")
      ))

    const matchesSearch =
      search === "" ||
      event.title?.toLowerCase().includes(search.toLowerCase()) ||
      event.address?.toLowerCase().includes(search.toLowerCase()) ||
      event.description?.toLowerCase().includes(search.toLowerCase())

    const matchesNearMe = !nearMe || !userLat || !userLng || (
      event.latitude && event.longitude &&
      getDistance(userLat, userLng, event.latitude, event.longitude) <= 5
    )

    return matchesFilter && matchesSearch && matchesNearMe
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("events.title")}</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              {t("events.subtitle")}
            </h1>
          </div>
        </section>

        {/* Search */}
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="relative max-w-xl">
            <input
              type="text"
              placeholder={t("events.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "14px 44px 14px 48px",
                fontSize: "14px",
                color: "#fff",
                outline: "none",
              }}
            />
            <svg
              style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="18" height="18" viewBox="0 0 24 24" fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Filters + Near Me */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
          {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.label)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  selectedFilter === filter.label
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (!navigator.geolocation) return
                navigator.geolocation.getCurrentPosition((pos) => {
                  setUserLat(pos.coords.latitude)
                  setUserLng(pos.coords.longitude)
                  setNearMe(true)
                })
              }}
              className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                nearMe
                  ? "bg-purple-500 text-white"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              📍 Cerca de mí
            </button>
            {nearMe && (
              <button
                onClick={() => { setNearMe(false); setUserLat(null); setUserLng(null) }}
                className="rounded-full px-5 py-3 text-sm font-medium border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Results */}
        <section className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">{t("common.loading")}</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">No events found.</p>
          ) : (
            filteredEvents.map((event, index) => {
              const past = isEventPast(event.date)
              return (
                <Link
                key={event.id}
                href={`/event/${createSlug(event.title)}`}
                className={`group overflow-hidden rounded-[32px] border bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up block ${past ? "opacity-60 border-white/5" : "border-white/10"}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                  <div className="relative h-[460px] overflow-hidden">
                    {event.image ? (
                      <Image src={event.image} alt={event.title} fill className="object-cover transition duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 bg-zinc-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                    <div className="absolute left-5 top-5 flex gap-2">
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
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6">
                      {event.date && (
                        <p className="text-sm uppercase tracking-wide text-zinc-400">
                          {past ? "Evento terminado" : new Date(event.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      )}
                      <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{event.title}</h2>
                      {event.description && (
                        <p className="mt-4 text-zinc-300 line-clamp-2">{event.description}</p>
                      )}
                      <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
                        {event.start_time && <span>🕒 {event.start_time}</span>}
                        {event.price && <span>🎟 {event.price}</span>}
                      </div>
                      
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}