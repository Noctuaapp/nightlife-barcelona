"use client"

import { useState } from "react"

import Image from "next/image"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { eventsData } from "../../data/events-data"

export default function EventsPage() {

  const days = [...new Set(eventsData.map((event) => event.day))]

  const [selectedDay, setSelectedDay] = useState(days[0])

  const filteredEvents = eventsData.filter(
    (event) => event.day === selectedDay
  )

  return (

    <>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-14">

          <div className="mx-auto max-w-7xl">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              Events

            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">

              Barcelona nightlife events

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Discover curated nightlife experiences, local celebrations and underground sessions across the city.

            </p>

          </div>

        </section>

        {/* CALENDAR */}

        <section className="mx-auto mt-14 max-w-7xl px-4">

          <div className="flex gap-4 overflow-x-auto pb-2">

            {days.map((day) => (

              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-2xl px-6 py-4 text-sm font-bold transition ${
                  selectedDay === day
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >

                {day}

              </button>

            ))}

          </div>

        </section>

        {/* EVENTS GRID */}

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">

          {filteredEvents.map((event, index) => (

            <div
              key={event.id}
              className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
              style={{
                animationDelay: `${index * 0.08}s`,
              }}
            >

              {/* IMAGE */}

              <div className="relative h-[460px] overflow-hidden">

                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* BADGES */}

                <div className="absolute left-5 top-5 flex flex-col gap-2">

                  {event.badges.map((badge) => (

                    <div
                      key={badge}
                      className="w-fit rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl"
                    >

                      {badge}

                    </div>

                  ))}

                </div>

                {/* CONTENT */}

                <div className="absolute bottom-0 left-0 w-full p-6">

                  <p className="text-sm uppercase tracking-wide text-zinc-400">

                    {event.area}

                  </p>

                  <h2 className="mt-3 text-4xl font-black tracking-tight text-white">

                    {event.title}

                  </h2>

                  <p className="mt-4 text-zinc-300">

                    {event.venue}

                  </p>

                  <div className="mt-6 flex items-center justify-between text-sm text-zinc-300">

                    <span>
                      🕒 {event.date}
                    </span>

                    <span>
                      🔥 {event.attendees}
                    </span>

                  </div>

                  {/* ACTIONS */}

                  <div className="mt-6 flex gap-3">

                    <button className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-105">

                      Remind me

                    </button>

                    <button className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/20">

                      View

                    </button>

                  </div>

                </div>

              </div>

            </div>

          ))}

        </section>

      </main>

      <BottomNav />

    </>
  )
}