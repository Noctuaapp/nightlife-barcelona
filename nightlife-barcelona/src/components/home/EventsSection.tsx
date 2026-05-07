"use client"

import Image from "next/image"

import { eventsData } from "../../data/events-data"

export default function EventsSection() {

  return (
    <section className="mx-auto mt-24 max-w-7xl px-4">

      {/* HEADER */}

      <div className="mb-8">

        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Barcelona events
        </p>

        <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
          Events tonight
        </h2>

      </div>

      {/* EVENTS */}

      <div className="grid gap-6 lg:grid-cols-3">

        {eventsData.map((event) => (

          <div
            key={event.id}
            className="group overflow-hidden rounded-[32px] border border-white/5 bg-zinc-900/70 transition duration-500 hover:-translate-y-2 hover:border-white/10"
          >

            {/* IMAGE */}

            <div className="relative h-64 overflow-hidden">

              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">

                {event.date}

              </div>

            </div>

            {/* CONTENT */}

            <div className="p-6">

              <p className="text-sm uppercase tracking-wide text-zinc-500">
                {event.venue}
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-tight text-white">

                {event.title}

              </h3>

              <p className="mt-4 leading-relaxed text-zinc-400">

                {event.lineup}

              </p>

              <button className="mt-8 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.03]">

                View event

              </button>

            </div>

          </div>

        ))}

      </div>

    </section>
  )
}