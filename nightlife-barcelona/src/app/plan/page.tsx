"use client"

import { useState } from "react"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { nightlifeData } from "../../data/nightlife-data"

export default function PlanPage() {

  const [people, setPeople] = useState(2)

  const [budget, setBudget] = useState(30)

  const [music, setMusic] = useState("Techno")

  const suggestions = nightlifeData.filter((club) => {

    const matchesMusic =
      music === "Techno"
        ? club.music === "Techno"
        : club.music === "Commercial"
  
    const matchesBudget =
      parseInt(club.price.replace("€", "")) <= budget
  
    return matchesMusic && matchesBudget
  })
  
  const suggestion =
    suggestions[Math.floor(Math.random() * suggestions.length)] ||
    nightlifeData[0]


  return (

    <>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-14">

          <div className="mx-auto max-w-5xl">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              AI nightlife planner

            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">

              Plan your night instantly

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Tell us your vibe, budget and group size and we’ll suggest the perfect Barcelona night.

            </p>

          </div>

        </section>

        {/* PLANNER */}

        <section className="mx-auto mt-16 max-w-5xl px-4">

          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">

            <div className="grid gap-8 md:grid-cols-3">

              {/* PEOPLE */}

              <div>

                <p className="mb-4 text-sm uppercase tracking-wide text-zinc-500">

                  People

                </p>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={people}
                  onChange={(e) =>
                    setPeople(Number(e.target.value))
                  }
                  className="w-full"
                />

                <p className="mt-4 text-3xl font-black text-white">

                  {people}

                </p>

              </div>

              {/* BUDGET */}

              <div>

                <p className="mb-4 text-sm uppercase tracking-wide text-zinc-500">

                  Budget (€)

                </p>

                <input
                  type="range"
                  min="10"
                  max="200"
                  value={budget}
                  onChange={(e) =>
                    setBudget(Number(e.target.value))
                  }
                  className="w-full"
                />

                <p className="mt-4 text-3xl font-black text-white">

                  €{budget}

                </p>

              </div>

              {/* MUSIC */}

              <div>

                <p className="mb-4 text-sm uppercase tracking-wide text-zinc-500">

                  Music

                </p>

                <div className="flex gap-3">

                  <button
                    onClick={() =>
                      setMusic("Techno")
                    }
                    className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                      music === "Techno"
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/5 text-white"
                    }`}
                  >

                    Techno

                  </button>

                  <button
                    onClick={() =>
                      setMusic("Commercial")
                    }
                    className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                      music === "Commercial"
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/5 text-white"
                    }`}
                  >

                    Commercial

                  </button>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* RESULT */}

        {suggestion && (

          <section className="mx-auto mt-14 max-w-5xl px-4">

            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-black">

              <div className="relative h-[500px]">

                <img
                  src={suggestion.image}
                  alt={suggestion.name}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full bg-black/60 p-8 backdrop-blur-md">

                  <p className="text-sm uppercase tracking-wide text-zinc-400">

                    Suggested plan

                  </p>

                  <h2 className="mt-3 text-5xl font-black text-white">

                    {suggestion.name}

                  </h2>

                  <p className="mt-4 max-w-2xl text-zinc-300">

                    Perfect for a group of {people} looking for {music.toLowerCase()} vibes tonight with a budget around €{budget}.

                  </p>

                  <div className="mt-8 grid gap-3 md:grid-cols-2">

<div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white backdrop-blur-xl">

  🎧 {suggestion.music}

</div>

<div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white backdrop-blur-xl">

  📍 {suggestion.neighborhood}

</div>

<div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white backdrop-blur-xl">

  🚇 {suggestion.nearestMetro}

</div>

<div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white backdrop-blur-xl">

  🚕 {suggestion.taxiEstimate}

</div>

<div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white backdrop-blur-xl">

  🍔 Late food nearby

</div>

<div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white backdrop-blur-xl">

  🌅 Best arrival: 01:30 AM

</div>

</div>

                </div>

              </div>

            </div>

          </section>

        )}

      </main>

      <BottomNav />

    </>
  )
}