import Image from "next/image"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { areasData } from "../../data/areas-data"

export default function EssentialsPage() {

  return (

    <>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-14">

          <div className="mx-auto max-w-7xl">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              Essentials

            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">

              Barcelona after-dark essentials

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Useful late-night services for nightlife, emergencies and surviving the city after dark.

            </p>

          </div>

        </section>

        {/* GRID */}

        <section className="mx-auto mt-16 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">

          {areasData.map((item, index) => (

            <div
              key={item.id}
              className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
              style={{
                animationDelay: `${index * 0.08}s`,
              }}
            >

              {/* IMAGE */}

              <div className="relative h-[420px] overflow-hidden">

                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* BADGES */}

                <div className="absolute left-5 top-5 flex flex-col gap-2">

                  {item.badges.map((badge) => (

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

                    {item.vibe}

                  </p>

                  <h2 className="mt-3 text-4xl font-black tracking-tight text-white">

                    {item.name}

                  </h2>

                  <p className="mt-4 text-zinc-300">

                    {item.bestFor}

                  </p>

                  <div className="mt-6 flex items-center justify-between text-sm text-zinc-300">

                    <span>
                      🌙 {item.energy}
                    </span>

                    <span>
                      🌍 {item.crowd}
                    </span>

                  </div>

                  {/* ACTION */}

                  <div className="mt-6">

                    <button className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-105">

                      Explore

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