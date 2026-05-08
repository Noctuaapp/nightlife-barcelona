"use client"

import { useState } from "react"

import Link from "next/link"
import Image from "next/image"

interface ClubCardProps {

  name: string

  music: string

  area: string

  price: string

  hours: string

  image: string

  rating: number

  people: number

  badges?: string[]

  terrace?: boolean

  vip?: boolean

  smokingArea?: boolean

  tableBooking?: boolean

  dresscode?: string
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
  badges = [],
}: ClubCardProps) {

  const [liveBadges, setLiveBadges] =
    useState(badges)

  return (

    <Link
      href={`/club/${encodeURIComponent(name)}`}
      className="group block overflow-hidden rounded-[30px] border border-white/10 bg-black transition duration-500 hover:-translate-y-2 hover:border-white/20"
    >

      {/* IMAGE */}

      <div className="relative h-[420px] overflow-hidden">

        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition duration-700 group-hover:scale-110"
        />

        {/* OVERLAY */}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* BADGES */}

        <div className="absolute left-5 top-5 flex flex-wrap gap-2">

          {liveBadges?.slice(0, 2).map((badge, index) => (

            <button
              key={badge}
              onClick={(e) => {

                e.preventDefault()

                const updated = [...liveBadges]

                updated[index] =
                  badge === "🔥 Trending"
                    ? "🟢 LIVE NOW"
                    : "🔥 Trending"

                setLiveBadges(updated)
              }}
              className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl transition hover:scale-105 hover:bg-white/20"
            >

              {badge}

            </button>

          ))}

        </div>

        {/* CONTENT */}

        <div className="absolute bottom-0 left-0 w-full bg-black/55 p-6 backdrop-blur-md">

          <p className="text-sm uppercase tracking-wide text-zinc-400">

            {music}

          </p>

          <h3 className="mt-2 text-4xl font-black tracking-tight text-white">

            {name}

          </h3>

          <div className="mt-5 flex items-center justify-between text-sm text-zinc-300">

            <span>
              📍 {area}
            </span>

            <span>
              ⭐ {rating}
            </span>

          </div>

          <div className="mt-5 flex flex-wrap gap-3">

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">

              🔥 {people}+ tonight

            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">

              🎟 {price}
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">

              🕒 {hours}
            </div>

          </div>

        </div>

      </div>

    </Link>
  )
}