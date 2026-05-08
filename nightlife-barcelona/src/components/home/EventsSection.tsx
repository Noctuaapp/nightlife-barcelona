"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { eventsData } from "../../data/events-data"

export default function EventsSection() {

  const categories = [
    "All",
    "Tonight",
    "Weekend",
    "VIP",
    "Festival",
  ]

  const [selectedCategory, setSelectedCategory] =
    useState("All")

  const filteredEvents =
    selectedCategory === "All"
      ? eventsData
      : eventsData.filter(
          (event) =>
            event.category === selectedCategory
        )

  return (

    <section className="mx-auto mt-28 max-w-7xl px-4">

      {/* HEADER */}

      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">

        <div className="max-w-3xl">

          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

            Live events

          </p>

          <h2 className="mt-4 text-5xl font-black tracking-tight text-white">

            What’s happening tonight

          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">

            Discover trending events, DJs and nightlife experiences happening across Barcelona.

          </p>

        </div>

        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">

          ● LIVE EVENTS

        </div>

      </div>

      {/* FILTERS */}

      <div className="mt-12 flex gap-3 overflow-x-auto pb-2">

        {categories.map((category) => (

          <button
            key={category}
            onClick={() =>
              setSelectedCategory(category)
            }
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

      {/* GRID */}

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {filteredEvents.map((event, index) => (

          <Link
            href={`/event/${event.slug}`}
            key={event.id}
            className="group overflow-hidden rounded-[30px] border border-white/10 bg-black transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
            style={{
              animationDelay: `${index * 0.08}s`,
            }}
          >

            {/* IMAGE */}

            <div className="relative h-[420px] overflow-hidden">

              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
              />

              {/* OVERLAY */}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              {/* BADGES */}

              <div className="absolute left-5 top-5 flex flex-wrap gap-2">

                {event.badges.map((badge) => (

                  <div
                    key={badge}
                    className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl"
                  >

                    {badge}

                  </div>

                ))}

              </div>

              {/* COUNTDOWN */}

              <div className="absolute right-5 top-5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 backdrop-blur-xl">

                {event.countdown}

              </div>

              {/* CONTENT */}

              <div className="absolute bottom-0 left-0 w-full bg-black/55 p-6 backdrop-blur-md">

                <p className="text-sm uppercase tracking-wide text-zinc-400">

                  {event.area}

                </p>

                <h3 className="mt-2 text-3xl font-black tracking-tight text-white">

                  {event.title}

                </h3>

                <div className="mt-5 flex items-center justify-between text-sm text-zinc-300">

                  <span>
                    📍 {event.venue}
                  </span>

                  <span>
                    🎟 {event.ticketPrice}
                  </span>

                </div>

                {/* LINEUP */}

                <div className="mt-5 flex flex-wrap gap-2">

                  {event.lineup.slice(0, 2).map((artist) => (

                    <div
                      key={artist}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-white backdrop-blur-xl"
                    >

                      🎧 {artist}

                    </div>

                  ))}

                </div>

                {/* FOOTER */}

                <div className="mt-6 flex items-center justify-between">

                  <p className="text-sm text-zinc-300">

                    🔥 {event.attendees}

                  </p>

                  <div className="flex gap-3">

                    <button
                      onClick={(e) => e.preventDefault()}
                      className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/20"
                    >

                      ❤️ Save

                    </button>

                    <button
                      onClick={(e) => e.preventDefault()}
                      className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:scale-105"
                    >

                      Remind me

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </Link>

        ))}

      </div>

    </section>
  )
}