"use client"

import { useState } from "react"

import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"

import ClubCard from "../components/nightlife/ClubCard"

import SearchBar from "../components/ui/SearchBar"

import EventsSection from "../components/home/EventsSection"
import AreasSection from "../components/home/AreasSection"

import { nightlifeData } from "../data/nightlife-data"

export default function Home() {

  const [selectedCategory, setSelectedCategory] = useState("All")

  const [search, setSearch] = useState("")

  const filteredClubs = nightlifeData.filter((club) => {

    const matchesCategory =

      selectedCategory === "All" ||

      (selectedCategory === "Techno" &&
        club.music === "Techno") ||

      (selectedCategory === "Commercial" &&
        club.music === "Commercial") ||

      (selectedCategory === "VIP" &&
        club.vip)

    const matchesSearch =

      club.name.toLowerCase().includes(search.toLowerCase()) ||

      club.neighborhood.toLowerCase().includes(search.toLowerCase()) ||

      club.music.toLowerCase().includes(search.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const filters = [
    "All",
    "Techno",
    "Commercial",
    "VIP",
  ]

  return (

    <>

      {/* ATMOSPHERE */}

      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute left-[-200px] top-[-200px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] right-[-200px] h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-3xl" />

      </div>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-10">

          <div className="mx-auto max-w-7xl">

            <div className="max-w-3xl">

              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
                Barcelona nightlife
              </p>

              <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">

                Discover the city after dark.

              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

                Clubs, events and nightlife essentials curated for Barcelona nights.

              </p>

              <div className="mt-8 max-w-xl">

                <SearchBar
                  search={search}
                  setSearch={setSearch}
                />

              </div>

            </div>

          </div>

        </section>
{/* TONIGHT IN BARCELONA */}

<section className="mx-auto mt-16 max-w-7xl px-4">

  <div className="flex items-end justify-between">

    <div>

      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

        Live tonight

      </p>

      <h2 className="mt-3 text-5xl font-black tracking-tight text-white">

        Tonight in Barcelona

      </h2>

    </div>

    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">

      ● LIVE

    </div>

  </div>

  <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

    {/* HERO CARD */}

    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-purple-500/20 via-white/[0.05] to-white/[0.02] p-8 backdrop-blur-2xl md:col-span-2">

      <div className="absolute right-[-60px] top-[-60px] h-52 w-52 rounded-full bg-purple-500/20 blur-3xl" />

      <p className="relative z-10 text-sm uppercase tracking-[0.3em] text-zinc-400">

        Trending tonight

      </p>

      <h3 className="relative z-10 mt-5 max-w-xl text-5xl font-black leading-none tracking-tight text-white">

        🔥 Razzmatazz is dominating Barcelona tonight.

      </h3>

      <p className="relative z-10 mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">

        Long queues, packed rooms and one of the strongest electronic music nights in the city.

      </p>

      <div className="relative z-10 mt-8 flex flex-wrap gap-3">

        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">

          ⏳ 40 min queue

        </div>

        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">

          🎧 Techno & indie

        </div>

        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">

          🌍 International crowd

        </div>

      </div>

    </div>

    {/* SIDE CARD */}

    <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 backdrop-blur-2xl">

      <p className="text-sm uppercase tracking-wide text-zinc-500">

        VIP demand

      </p>

      <p className="mt-4 text-3xl font-black text-white">

        🍾 Opium

      </p>

      <p className="mt-3 text-zinc-400">

        VIP tables almost sold out tonight.

      </p>

    </div>

    {/* SIDE CARD */}

    <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 backdrop-blur-2xl">

      <p className="text-sm uppercase tracking-wide text-zinc-500">

        Cocktail hotspot

      </p>

      <p className="mt-4 text-3xl font-black text-white">

        🍸 Paradiso

      </p>

      <p className="mt-3 text-zinc-400">

        One of the busiest cocktail bars tonight.

      </p>

    </div>

  </div>

</section>
        {/* CLUBS */}

        <section className="mx-auto mt-20 max-w-7xl px-4">

          <div className="flex items-end justify-between">

            <div>

              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

                Clubs

              </p>

              <h2 className="mt-3 text-5xl font-black tracking-tight text-white">

                Barcelona nightlife

              </h2>

            </div>

          </div>

          {/* FILTERS */}

          <div className="mt-10 flex gap-3 overflow-x-auto pb-2">

            {filters.map((filter) => (

              <button
                key={filter}
                onClick={() => setSelectedCategory(filter)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === filter
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {filter}
              </button>

            ))}

          </div>

          {/* GRID */}

          <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

            {filteredClubs.map((club, index) => (

              <div
                key={club.id}
                className="fade-up"
                style={{
                  animationDelay: `${index * 0.08}s`,
                }}
              >

                <ClubCard
                  name={club.name}
                  music={club.music}
                  area={club.neighborhood}
                  price={club.price}
                  hours={club.hours}
                  image={club.image}
                  rating={club.rating}
                  people={club.people}
                  badges={club.badges}
                  terrace={club.terrace}
                  vip={club.vip}
                  smokingArea={club.smokingArea}
                  tableBooking={club.tableBooking}
                  dresscode={club.dresscode}
                />

              </div>

            ))}

          </div>

        </section>

        {/* EVENTS */}

        <EventsSection />

        {/* ESSENTIALS */}

        <AreasSection />

      </main>

      <BottomNav />

    </>
  )
}