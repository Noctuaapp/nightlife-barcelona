"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState("All")

  const filters = ["All", "Festival", "Free", "Featured"]

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
      if (data) setEvents(data)
      setLoading(false)
    }
    fetchEvents()
  }, [])

  const filteredEvents = events.filter((event) => {
    if (selectedFilter === "All") return true
    if (selectedFilter === "Featured") return event.featured === true
    if (selectedFilter === "Free") return event.price?.toLowerCase() === "free"
    if (selectedFilter === "Festival") return event.music?.toLowerCase().includes("festival") || event.title?.toLowerCase().includes("festival") || event.title?.toLowerCase().includes("fiesta")
    return true
  })

  const createSlug = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Events</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              Barcelona events
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Festivals, street parties, local celebrations and the best independent events across the city.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  selectedFilter === filter
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">Loading events...</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">No events found.</p>
          ) : (
            filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="relative h-[460px] overflow-hidden">
                  {event.image ? (
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                  {event.featured && (
                    <div className="absolute left-5 top-5">
                      <div className="w-fit rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl">
                        ⭐ Featured
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 w-full p-6">
                    {event.date && (
                      <p className="text-sm uppercase tracking-wide text-zinc-400">
                        {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    )}
                    <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                      {event.title}
                    </h2>
                    {event.description && (
                      <p className="mt-4 text-zinc-300 line-clamp-2">{event.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
                      {event.start_time && <span>🕒 {event.start_time}</span>}
                      {event.price && <span>🎟 {event.price}</span>}
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Link
                        href={`/event/${createSlug(event.title)}`}
                        className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-105"
                      >
                        View event
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}