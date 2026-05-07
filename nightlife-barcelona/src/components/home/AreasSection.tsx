"use client"

import Image from "next/image"

import { areasData } from "../../data/areas-data"

export default function AreasSection() {

  return (

    <section className="mx-auto mt-24 max-w-7xl px-4">

      {/* HEADER */}

      <div className="mb-8">

        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Explore Barcelona
        </p>

        <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
          Explore by area
        </h2>

      </div>

      {/* GRID */}

      <div className="grid gap-6 lg:grid-cols-3">

        {areasData.map((area) => (

          <div
            key={area.id}
            className="group relative overflow-hidden rounded-[32px]"
          >

            {/* IMAGE */}

            <div className="relative h-[420px] overflow-hidden rounded-[32px]">

              <Image
                src={area.image}
                alt={area.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
              />

              {/* OVERLAY */}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              {/* CONTENT */}

              <div className="absolute bottom-0 left-0 w-full p-8">

                <div className="w-fit rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">

                  {area.venues} venues

                </div>

                <h3 className="mt-5 text-4xl font-black tracking-tight text-white">

                  {area.name}

                </h3>

                <p className="mt-4 max-w-xs leading-relaxed text-zinc-300">

                  {area.description}

                </p>

                <button className="mt-8 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.03]">

                  Explore area

                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </section>
  )
}