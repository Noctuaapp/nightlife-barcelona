import Image from "next/image"
import Link from "next/link"

import { eventsData } from "../../../data/events-data"

interface EventPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function EventPage({
  params,
}: EventPageProps) {

  const { slug } = await params

  const event = eventsData.find(
    (event) => event.slug === slug
  )

  if (!event) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-black text-white">

        Event not found

      </div>

    )
  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* HERO */}

      <section className="relative h-[85vh] overflow-hidden">

        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />

        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">

          <div className="mx-auto max-w-7xl">

            <div className="flex flex-wrap gap-3">

              {event.badges.map((badge) => (

                <div
                  key={badge}
                  className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl"
                >

                  {badge}

                </div>

              ))}

            </div>

            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-none tracking-tight text-white md:text-7xl">

              {event.title}

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">

              {event.description}

            </p>

            {/* ACTIONS */}

            <div className="mt-10 flex flex-wrap gap-4">

              <button className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:scale-105">

                Buy tickets

              </button>

              <button className="rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/[0.08]">

                ❤️ Save event

              </button>

              <button className="rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/[0.08]">

                🔔 Remind me

              </button>

            </div>

            {/* STATS */}

            <div className="mt-10 flex flex-wrap gap-4">

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">

                <p className="text-sm text-zinc-400">

                  Countdown

                </p>

                <p className="mt-1 text-2xl font-black text-emerald-300">

                  {event.countdown}

                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">

                <p className="text-sm text-zinc-400">

                  Venue

                </p>

                <p className="mt-1 text-2xl font-black text-white">

                  {event.venue}

                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">

                <p className="text-sm text-zinc-400">

                  Tickets

                </p>

                <p className="mt-1 text-2xl font-black text-white">

                  {event.ticketPrice}

                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* INFO */}

      <section className="mx-auto max-w-7xl px-4 py-20">

        <div className="grid gap-10 lg:grid-cols-3">

          {/* LEFT */}

          <div className="lg:col-span-2">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              Lineup

            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-white">

              DJs & artists performing

            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2">

              {event.lineup.map((artist) => (

                <div
                  key={artist}
                  className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
                >

                  <p className="text-sm uppercase tracking-wide text-zinc-500">

                    Artist

                  </p>

                  <p className="mt-3 text-2xl font-black text-white">

                    🎧 {artist}

                  </p>

                </div>

              ))}

            </div>

            {/* ABOUT */}

            <div className="mt-16">

              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

                Event vibe

              </p>

              <h3 className="mt-4 text-4xl font-black tracking-tight text-white">

                {event.vibe}

              </h3>

              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">

                Barcelona nightlife experience curated for music lovers, international visitors and unforgettable nights.

              </p>

            </div>

          </div>

          {/* RIGHT */}

          <div className="space-y-5">

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">

                Date

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                {event.day}

              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">

                Time

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                🕒 {event.date}

              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">

                Area

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                📍 {event.area}

              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">

                Dresscode

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                👕 {event.dresscode}

              </p>

            </div>

            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-emerald-300">

                Attendance

              </p>

              <p className="mt-2 text-2xl font-black text-white">

                🔥 {event.attendees}

              </p>

            </div>

          </div>

        </div>

      </section>

      {/* MORE EVENTS */}

      <section className="mx-auto max-w-7xl px-4 pb-24">

        <div className="flex items-end justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              More events

            </p>

            <h2 className="mt-3 text-5xl font-black tracking-tight text-white">

              Continue exploring

            </h2>

          </div>

        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          {eventsData
            .filter((item) => item.id !== event.id)
            .slice(0, 2)
            .map((item) => (

              <Link
                key={item.id}
                href={`/event/${item.slug}`}
                className="group overflow-hidden rounded-[30px] border border-white/10 bg-black transition hover:-translate-y-2 hover:border-white/20"
              >

                <div className="relative h-[260px] overflow-hidden">

                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  <div className="absolute bottom-0 left-0 w-full bg-black/55 p-6 backdrop-blur-md">

                    <p className="text-sm uppercase tracking-wide text-zinc-400">

                      {item.area}

                    </p>

                    <h3 className="mt-2 text-3xl font-black text-white">

                      {item.title}

                    </h3>

                    <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">

                      <span>
                        🎧 {item.lineup[0]}
                      </span>

                      <span>
                        🔥 {item.attendees}
                      </span>

                    </div>

                  </div>

                </div>

              </Link>

            ))}

        </div>

      </section>

    </main>
  )
}