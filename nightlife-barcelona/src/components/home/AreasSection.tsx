import AreaCard from "./AreaCard"

import { areasData } from "../../data/areas-data"

export default function AreasSection() {

  return (

    <section className="mx-auto mt-28 max-w-7xl px-4">

      {/* HEADER */}

      <div className="max-w-3xl">

        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

          Night essentials

        </p>

        <h2 className="mt-4 text-5xl font-black tracking-tight text-white">

          Everything you need after dark

        </h2>

        <p className="mt-6 text-lg leading-relaxed text-zinc-400">

          Pharmacies, supermarkets, ATMs and useful late-night services across Barcelona.

        </p>

      </div>

      {/* GRID */}

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {areasData.map((area, index) => (

          <div
            key={area.id}
            className="fade-up"
            style={{
              animationDelay: `${index * 0.08}s`,
            }}
          >

            <AreaCard
              name={area.name}
              image={area.image}
              vibe={area.vibe}
              crowd={area.crowd}
              bestFor={area.bestFor}
              energy={area.energy}
              badges={area.badges}
              mapsLink={area.mapsLink}
              actionLabel={area.actionLabel}
            />

          </div>

        ))}

      </div>

    </section>
  )
}