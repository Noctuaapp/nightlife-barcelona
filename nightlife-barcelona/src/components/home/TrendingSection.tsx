"use client"

import Image from "next/image"
import Link from "next/link"

import { nightlifeData } from "../../data/nightlife-data"

export default function TrendingSection() {

  const trending = nightlifeData.slice(0, 3)

  return (
    <section className="mx-auto mt-20 max-w-7xl px-4">

      {/* HEADER */}

      <div className="mb-8 flex items-end justify-between">

        <div>

          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Discover
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
            Trending tonight
          </h2>

        </div>

        <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10">

          View all

        </button>

      </div>

      {/* CARDS */}

      <div className="grid gap-6 lg:grid-cols-3">

        {trending.map((club) => (

          <Link
            key={club.id}
            href={`/club/${club.name.toLowerCase()}`}
            className="group relative overflow-hidden rounded-[32px]"
          >

            {/* IMAGE */}

            <div className="relative h-[420px] overflow-hidden">

              <Image
                src={club.image}
                alt={club.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
              />

              {/* OVERLAY */}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              {/* CONTENT */}

              <div className="absolute bottom-0 left-0 w-full p-8">

                <div className="flex items-center gap-2">

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                    {club.music}
                  </span>

                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
                    {club.neighborhood}
                  </span>

                </div>

                <h3 className="mt-5 text-4xl font-black tracking-tight text-white">

                  {club.name}

                </h3>

                <div className="mt-4 flex items-center justify-between">

                  <div>

                    <p className="text-lg font-semibold text-white">
                      {club.price}
                    </p>

                    <p className="text-sm text-zinc-300">
                      Entry tonight
                    </p>

                  </div>

                  <div className="translate-x-0 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition duration-300 group-hover:translate-x-1">

                    Explore →

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