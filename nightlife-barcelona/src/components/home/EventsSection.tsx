"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "../../lib/supabase"

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
}

const createSlug = (title: string) =>
  title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export default function EventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "Tonight", "Featured", "Sold out"]

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
      if (data) setEvents(data)
    }
    fetchEvents()
  }, [])

  const today = new Date().toISOString().split("T")[0]

  const filteredEvents = events.filter((event) => {
    if (selectedCategory === "All") return event.featured === true
    if (selectedCategory === "Tonight") return event.date === today
    if (selectedCategory === "Featured") return event.featured === true
    if (selectedCategory === "Sold out") return event.sold_out === true
    return true
  }).slice(0, 3)

  return (
    <section className="mx-auto mt-28 max-w-7xl px-4">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Live events</p>
          <h2 className="mt-4 text-5xl font-black tracking-tight text-white">
            What's happening
          </h2>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">
          ● LIVE EVENTS
        </div>
      </div>

      <div className="mt-12 flex gap-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === category
                ? "bg-white text-black"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.length === 0 ? (
          <p className="col-span-3 text-center text-zinc-500 py-10">No events found.</p>
        ) : (
          filteredEvents.map((event, index) => (
            <Link
              href={`/event/${createSlug(event.title)}`}
              key={event.id}
              className="group overflow-hidden rounded-[30px] border border-white/10 bg-black transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="relative h-[420px] overflow-hidden">
                <Image
                  src={event.image || "/clubs/razz.jpg"}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  {event.featured && (
                    <div className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl">
                      🔥 Featured
                    </div>
                  )}
                  {event.sold_out && (
                    <div className="rounded-full border border-red-500/20 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 backdrop-blur-xl">
                      🚫 Sold out
                    </div>
                  )}
                </div>

                <div className="absolute right-5 top-5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 backdrop-blur-xl">
                  {event.date === today ? "Tonight" : event.date}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {event.title}
                  </h3>
                  <div className="mt-5 flex items-center justify-between text-sm text-zinc-300">
                    {event.start_time && <span>🕒 {event.start_time}</span>}
                    <span>🎟 {event.price || "TBA"}</span>
                  </div>
                  {event.description && (
                    <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{event.description}</p>
                  )}
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
          See all events →
        </Link>
      </div>
    </section>
  )
}