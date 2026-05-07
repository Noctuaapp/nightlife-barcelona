"use client"
import EventsSection from "../components/home/EventsSection"
import TrendingSection from "../components/home/TrendingSection"
import { useState } from "react"

import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"

import ClubCard from "../components/nightlife/ClubCard"

import SearchBar from "../components/ui/SearchBar"

import { nightlifeData } from "../data/nightlife-data"

export default function Home() {

  const [selectedCategory, setSelectedCategory] =
    useState("All")

  const [search, setSearch] = useState("")

  const currentHour = new Date().getHours()

  const openNowClubs = nightlifeData.filter(() => {
    return currentHour >= 0 && currentHour <= 6
  })

  const filteredClubs = nightlifeData.filter((club) => {

    const matchesCategory =
      selectedCategory === "All" ||
      club.music === selectedCategory

    const matchesSearch =
      club.name.toLowerCase().includes(search.toLowerCase()) ||
      club.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      club.music.toLowerCase().includes(search.toLowerCase())

    return matchesCategory && matchesSearch
  })

  return (
    <>
      <BottomNav />

      <main className="min-h-screen bg-black pb-32 text-white">

        <Header />

        {/* HERO */}

        <section className="relative overflow-hidden border-b border-zinc-900">

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.15),transparent_60%)]" />

          <div className="relative mx-auto max-w-7xl px-4 py-20">

            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
              Barcelona nightlife platform
            </p>

            <h1 className="max-w-4xl text-5xl font-black leading-none tracking-tight md:text-7xl">

              Discover the best
              nightlife in
              Barcelona.

            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Clubs, rooftops, bars, events and nightlife experiences —
              all in one modern platform.

            </p>

            <div className="mt-10 max-w-2xl">

              <SearchBar
                search={search}
                setSearch={setSearch}
              />

            </div>

            {/* STATS */}

            <div className="mt-12 flex flex-wrap gap-8">

              <div>

                <p className="text-4xl font-bold">
                  59+
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Verified venues
                </p>

              </div>

              <div>

                <p className="text-4xl font-bold">
                  Live
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Nightlife data
                </p>

              </div>

              <div>

                <p className="text-4xl font-bold">
                  BCN
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  First launch city
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* OPEN NOW */}

        <section className="mx-auto mt-10 max-w-7xl px-4">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <p className="text-sm uppercase tracking-widest text-green-500">
                Live now
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Open tonight
              </h2>

            </div>

            <div className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
              Live nightlife
            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {openNowClubs.map((club) => (

<ClubCard
key={club.id}
name={club.name}
music={club.music}
area={club.neighborhood}
price={club.price}
hours={club.hours}
image={club.image}
rating={club.rating}
people={club.people}
/>

            ))}

          </div>

        </section>
        <TrendingSection />
        {/* FILTERS */}

        <section className="mx-auto mt-14 max-w-7xl px-4">

          <div className="flex gap-3 overflow-x-auto pb-2">

            {[
              "All",
              "Techno",
              "Commercial",
              "Cocktail Bar",
              "Mixed",
            ].map((category) => (

              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(category)
                }
                className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                  selectedCategory === category
                    ? "bg-white text-black"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >

                {category}

              </button>

            ))}

          </div>

        </section>
        <EventsSection />
        {/* CLUB GRID */}

        <section className="mx-auto mt-10 max-w-7xl px-4">

  {filteredClubs.length === 0 ? (

    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-white/5 bg-zinc-900/40 p-10 text-center">

      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 text-5xl backdrop-blur-xl">

        🌙

      </div>

      <h2 className="mt-8 text-3xl font-bold text-white">
        No nightlife found
      </h2>

      <p className="mt-4 max-w-md text-lg leading-relaxed text-zinc-400">

        Try searching for another venue, music style
        or neighborhood in Barcelona.

      </p>

      <button
        onClick={() => {
          setSearch("")
          setSelectedCategory("All")
        }}
        className="mt-8 rounded-2xl bg-white px-6 py-3 font-semibold text-black transition hover:scale-[1.03]"
      >

        Reset filters

      </button>

    </div>

  ) : (

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

      {filteredClubs.map((club) => (

<ClubCard
key={club.id}
name={club.name}
music={club.music}
area={club.neighborhood}
price={club.price}
hours={club.hours}
image={club.image}
rating={club.rating}
people={club.people}
/>

      ))}

    </div>

  )}

</section>

      </main>
    </>
  )
}