"use client"

import Image from "next/image"
import Link from "next/link"

interface ClubCardProps {
  name: string
  music: string
  area: string
  price: string
  hours: string
  image: string
  rating: number
  people: number
}

export default function ClubCard({
  name,
  music,
  area,
  price,
  hours,
  image,
  rating,
  people,
}: ClubCardProps) {

  return (

    <Link href={`/club/${encodeURIComponent(name.toLowerCase())}`}>

      <div className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl transition duration-700 hover:-translate-y-3 hover:border-white/20 hover:shadow-[0_20px_80px_rgba(255,255,255,0.08)]">

        {/* LIGHT EFFECT */}

        <div className="absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100">

          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />

        </div>

        {/* IMAGE */}

        <div className="relative h-72 overflow-hidden">

          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition duration-700 group-hover:scale-110"
          />

          {/* OVERLAY */}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          {/* MUSIC */}

          <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-xl">

            {music}

          </div>

        </div>

        {/* CONTENT */}

        <div className="relative p-6">

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-sm uppercase tracking-wide text-zinc-500">

                {area}

              </p>

              <h3 className="mt-2 text-3xl font-black tracking-tight text-white">

                {name}

              </h3>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur">

              {price}

            </div>

          </div>

          {/* STATS */}

          <div className="mt-6 flex items-center justify-between text-sm">

            <div className="flex items-center gap-2 text-zinc-400">

              <span>
                ⭐
              </span>

              <span className="font-semibold text-white">

                {rating}

              </span>

            </div>

            <div className="text-zinc-400">

              {hours}

            </div>

          </div>

          {/* FOOTER */}

          <div className="mt-5 flex items-center justify-between">

            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur">

              {people}+ tonight

            </div>

            <div className="text-sm font-semibold text-white transition duration-300 group-hover:translate-x-1">

              Explore →

            </div>

          </div>

        </div>

      </div>

    </Link>
  )
}