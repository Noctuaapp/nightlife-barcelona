"use client"

import { useState } from "react"

export default function PlanYourNight() {

  const [people, setPeople] = useState(2)

  const [budget, setBudget] = useState(30)

  const [vibe, setVibe] = useState("Techno")

  return (

    <section className="mx-auto mt-32 max-w-7xl px-4">

      {/* HEADER */}

      <div className="max-w-3xl">

        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

          Night planner

        </p>

        <h2 className="mt-4 text-5xl font-black tracking-tight text-white">

          Plan your night instantly

        </h2>

        <p className="mt-6 text-lg leading-relaxed text-zinc-400">

          Tell us your vibe and budget and discover the best nightlife route in Barcelona.

        </p>

      </div>

      {/* PLANNER */}

      <div className="mt-14 grid gap-8 lg:grid-cols-2">

        {/* LEFT */}

        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">

          {/* PEOPLE */}

          <div>

            <p className="text-sm uppercase tracking-wide text-zinc-500">

              People

            </p>

            <div className="mt-4 flex gap-3">

              {[1, 2, 3, 4, 5].map((value) => (

                <button
                  key={value}
                  onClick={() => setPeople(value)}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    people === value
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >

                  {value}

                </button>

              ))}

            </div>

          </div>

          {/* BUDGET */}

          <div className="mt-10">

            <p className="text-sm uppercase tracking-wide text-zinc-500">

              Budget

            </p>

            <div className="mt-4 flex gap-3">

              {[20, 30, 50, 100].map((value) => (

                <button
                  key={value}
                  onClick={() => setBudget(value)}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    budget === value
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >

                  €{value}

                </button>

              ))}

            </div>

          </div>

          {/* VIBE */}

          <div className="mt-10">

            <p className="text-sm uppercase tracking-wide text-zinc-500">

              Vibe

            </p>

            <div className="mt-4 flex flex-wrap gap-3">

              {[
                "Techno",
                "VIP",
                "Commercial",
                "Underground",
              ].map((value) => (

                <button
                  key={value}
                  onClick={() => setVibe(value)}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    vibe === value
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >

                  {value}

                </button>

              ))}

            </div>

          </div>

        </div>

        {/* RESULT */}

        <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-white/[0.03] p-8 backdrop-blur-2xl">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm uppercase tracking-wide text-emerald-300">

                Recommended plan

              </p>

              <h3 className="mt-3 text-4xl font-black text-white">

                {vibe === "Techno"
                  ? "Input + Razzmatazz"
                  : vibe === "VIP"
                  ? "Opium VIP"
                  : vibe === "Commercial"
                  ? "Pacha Barcelona"
                  : "Apolo"}

              </h3>

            </div>

            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">

              ● LIVE MATCH

            </div>

          </div>

          <div className="mt-10 space-y-5">

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-sm text-zinc-400">

                Estimated total

              </p>

              <p className="mt-2 text-3xl font-black text-white">

                €{budget * people}

              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-sm text-zinc-400">

                Transport

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                🚕 Uber + Night Bus

              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-sm text-zinc-400">

                Afterparty food

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                🍔 Late night burgers nearby

              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-sm text-zinc-400">

                Best arrival time

              </p>

              <p className="mt-2 text-xl font-bold text-white">

                🕒 01:15 AM

              </p>

            </div>

          </div>

          <button className="mt-8 w-full rounded-full bg-white px-6 py-4 text-sm font-black text-black transition hover:scale-[1.02]">

            Build my night

          </button>

        </div>

      </div>

    </section>
  )
}