"use client"

import { useState } from "react"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { nightlifeData } from "../../data/nightlife-data"

export default function AdminPage() {

  const [clubs, setClubs] = useState(nightlifeData)

  const queueLevels = [
    "No queue",
    "Short queue",
    "Medium queue",
    "Long queue",
    "Massive queue",
  ]

  const toggleTrending = (name: string) => {

    setClubs((prev) =>
      prev.map((club) =>
        club.name === name
          ? {
              ...club,
              trending: !club.trending,
            }
          : club
      )
    )
  }

  const toggleSoldOut = (name: string) => {

    setClubs((prev) =>
      prev.map((club) =>
        club.name === name
          ? {
              ...club,
              soldOut: !club.soldOut,
            }
          : club
      )
    )
  }

  const updateQueue = (
    name: string,
    level: string
  ) => {

    setClubs((prev) =>
      prev.map((club) =>
        club.name === name
          ? {
              ...club,
              queue: level,
            }
          : club
      )
    )
  }

  return (

    <>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-14">

          <div className="mx-auto max-w-7xl">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              Admin panel

            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">

              Live nightlife control

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Control nightlife activity, queues and live venue status across Barcelona.

            </p>

          </div>

        </section>

        {/* LIVE STATS */}

        <section className="mx-auto mt-14 max-w-7xl px-4">

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-6">

              <p className="text-sm uppercase tracking-wide text-zinc-400">

                Clubs live

              </p>

              <h2 className="mt-4 text-5xl font-black text-white">

                12

              </h2>

              <p className="mt-3 text-sm text-emerald-300">

                +3 active now

              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-orange-500/15 to-orange-500/5 p-6">

              <p className="text-sm uppercase tracking-wide text-zinc-400">

                Busy venues

              </p>

              <h2 className="mt-4 text-5xl font-black text-white">

                4

              </h2>

              <p className="mt-3 text-sm text-orange-300">

                Peak nightlife hour

              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-pink-500/15 to-pink-500/5 p-6">

              <p className="text-sm uppercase tracking-wide text-zinc-400">

                VIP sold out

              </p>

              <h2 className="mt-4 text-5xl font-black text-white">

                3

              </h2>

              <p className="mt-3 text-sm text-pink-300">

                Demand increasing

              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 p-6">

              <p className="text-sm uppercase tracking-wide text-zinc-400">

                Reports tonight

              </p>

              <h2 className="mt-4 text-5xl font-black text-white">

                28

              </h2>

              <p className="mt-3 text-sm text-cyan-300">

                Live user activity

              </p>

            </div>

          </div>

        </section>

        {/* ACTIVITY FEED */}

        <section className="mx-auto mt-10 max-w-7xl px-4">

          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

                  Activity feed

                </p>

                <h2 className="mt-3 text-4xl font-black text-white">

                  Live nightlife updates

                </h2>

              </div>

              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">

                ● LIVE

              </div>

            </div>

            <div className="mt-8 space-y-4">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                <p className="text-sm text-zinc-400">

                  01:42 AM

                </p>

                <p className="mt-2 font-semibold text-white">

                  🔥 Razzmatazz marked as trending

                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                <p className="text-sm text-zinc-400">

                  01:51 AM

                </p>

                <p className="mt-2 font-semibold text-white">

                  ⏳ Opium queue increased to long queue

                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                <p className="text-sm text-zinc-400">

                  02:03 AM

                </p>

                <p className="mt-2 font-semibold text-white">

                  🍾 VIP tables sold out at Pacha

                </p>

              </div>

            </div>

          </div>

        </section>

        {/* CLUB CONTROLS */}

        <section className="mx-auto mt-14 max-w-7xl px-4">

          <div className="grid gap-6">

            {clubs.map((club) => (

              <div
                key={club.id}
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
              >

                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

                  {/* INFO */}

                  <div>

                    <p className="text-sm uppercase tracking-wide text-zinc-500">

                      {club.music}

                    </p>

                    <h2 className="mt-2 text-3xl font-black text-white">

                      {club.name}

                    </h2>

                    <div className="mt-5 flex flex-wrap gap-3">

                      <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">

                        📍 {club.neighborhood}

                      </div>

                      <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">

                        🔥 {club.liveStatus}

                      </div>

                      <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">

                        ⏳ {club.queue}

                      </div>

                    </div>

                    {/* QUEUE CONTROL */}

                    <div className="mt-6">

                      <p className="mb-3 text-sm uppercase tracking-wide text-zinc-500">

                        Live queue control

                      </p>

                      <div className="flex flex-wrap gap-2">

                        {queueLevels.map((level) => (

                          <button
                            key={level}
                            onClick={() =>
                              updateQueue(club.name, level)
                            }
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                              club.queue === level
                                ? "bg-white text-black"
                                : "border border-white/10 bg-white/5 text-white"
                            }`}
                          >

                            {level}

                          </button>

                        ))}

                      </div>

                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-wrap gap-3">

                    <button
                      onClick={() =>
                        toggleTrending(club.name)
                      }
                      className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                        club.trending
                          ? "bg-emerald-400 text-black"
                          : "border border-white/10 bg-white/5 text-white"
                      }`}
                    >

                      🔥 Trending

                    </button>

                    <button
                      onClick={() =>
                        toggleSoldOut(club.name)
                      }
                      className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                        club.soldOut
                          ? "bg-red-500 text-white"
                          : "border border-white/10 bg-white/5 text-white"
                      }`}
                    >

                      🚫 Sold out

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>

      <BottomNav />

    </>
  )
}