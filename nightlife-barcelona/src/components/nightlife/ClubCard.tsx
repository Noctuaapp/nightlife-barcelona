"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

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

  const [saved, setSaved] = useState(false)

  const currentHour = new Date().getHours()

  const openNow =
    currentHour >= 0 &&
    currentHour <= 6

  useEffect(() => {

    const savedClubs =
      JSON.parse(localStorage.getItem("savedClubs") || "[]")

    if (savedClubs.includes(name)) {
      setSaved(true)
    }

  }, [name])

  const toggleSave = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {

    e.preventDefault()

    const savedClubs =
      JSON.parse(localStorage.getItem("savedClubs") || "[]")

    let updatedClubs = []

    if (savedClubs.includes(name)) {

      updatedClubs =
        savedClubs.filter((club: string) => club !== name)

      setSaved(false)

    } else {

      updatedClubs = [...savedClubs, name]

      setSaved(true)
    }

    localStorage.setItem(
      "savedClubs",
      JSON.stringify(updatedClubs)
    )
  }

  return (

    <Link href={`/club/${name.toLowerCase()}`}>

      <div className="group overflow-hidden rounded-[28px] border border-white/5 bg-zinc-900/80 shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:border-white/10 hover:bg-zinc-900 hover:shadow-[0_20px_80px_rgba(0,0,0,0.45)]">

        {/* IMAGE */}

        <div className="relative overflow-hidden">

          <Image
            src={image}
            alt={name}
            width={600}
            height={400}
            className="h-56 w-full object-cover transition duration-700 group-hover:scale-110"
          />

          {/* IMAGE OVERLAY */}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80" />

          {/* STATUS */}

          <div className="absolute left-4 top-4">

            {openNow ? (
              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                OPEN NOW
              </span>
            ) : (
              <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                CLOSED
              </span>
            )}

          </div>

          {/* FAVORITE */}

          <button
            onClick={toggleSave}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-xl backdrop-blur-xl transition hover:scale-110 hover:bg-black/60"
          >
            {saved ? "❤️" : "🤍"}
          </button>

        </div>

        {/* CONTENT */}

        <div className="p-6">

          <div className="flex items-start justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold tracking-tight text-white transition group-hover:text-zinc-100">
                {name}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                  {music}
                </span>

                <span className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-300">
                  {area}
                </span>

              </div>

            </div>

            <div className="text-right">

              <p className="text-xl font-bold text-white">
                {price}
              </p>

              <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                Entry
              </p>

            </div>

          </div>
          <div className="mt-6 flex items-center justify-between">

<div className="flex items-center gap-2">

  <span className="text-lg">
    ⭐
  </span>

  <span className="font-semibold text-white">
    {rating}
  </span>

</div>

<div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur">

  {people}+ people tonight

</div>

</div>
          {/* FOOTER */}

          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">

            <div className="flex flex-col">

              <span className="text-sm font-medium text-white">
                {hours}
              </span>

              <span className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                Tonight
              </span>

            </div>

            <span className="translate-x-0 text-sm font-semibold text-zinc-400 transition duration-300 group-hover:translate-x-1 group-hover:text-white">

              View →

            </span>

          </div>

        </div>

      </div>

    </Link>
  )
}