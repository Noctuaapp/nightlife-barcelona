import Image from "next/image"

import { eventsData } from "../../data/events-data"

export default function EventsSection() {

  return (

    <section className="mx-auto mt-28 max-w-7xl px-4">

      {/* HEADER */}

      <div className="mb-12 flex items-end justify-between gap-6">

        <div>

          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

            Live experiences

          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">

            Trending events tonight

          </h2>

        </div>

        <button className="hidden rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] md:block">

          Explore all

        </button>

      </div>

      {/* EVENTS */}

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

        {eventsData.map((event) => (

          <div
            key={event.id}
            className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-white/20"
          >

            {/* IMAGE */}

            <div className="relative h-72 overflow-hidden">

              <Image
                src={event.image}
                alt={event.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

            </div>

            {/* CONTENT */}

            <div className="p-6">

              <p className="text-sm uppercase tracking-wide text-zinc-500">

                {event.club}

              </p>

              <h3 className="mt-3 text-3xl font-black tracking-tight text-white">

                {event.name}

              </h3>

              <div className="mt-6 flex items-center justify-between">

                <div>

                  <p className="text-sm text-zinc-500">

                    Date

                  </p>

                  <p className="mt-1 font-semibold text-white">

                    {event.date}

                  </p>

                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">

                  {event.price}

                </div>

              </div>

              <div className="mt-6 flex items-center justify-between">

                <div className="text-sm text-zinc-400">

                  🔥 {event.attending} attending

                </div>

                <button className="text-sm font-semibold text-white transition group-hover:translate-x-1">

                  Explore →

                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </section>
  )
}