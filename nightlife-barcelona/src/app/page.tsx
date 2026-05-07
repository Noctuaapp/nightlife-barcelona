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
      club.music === selectedCategory

    const matchesSearch =
      club.name.toLowerCase().includes(search.toLowerCase()) ||
      club.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      club.music.toLowerCase().includes(search.toLowerCase())

    return matchesCategory && matchesSearch
  })

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

  <div className="grid gap-14 lg:grid-cols-2 lg:items-center">

    {/* LEFT */}

    <div className="max-w-3xl">

      <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
        Barcelona nightlife
      </p>

      <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">

        Discover the city after dark.

      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

        Explore clubs, rooftop bars, underground events and nightlife experiences across Barcelona.

      </p>

      {/* LIVE STATUS */}

      <div className="mt-8 flex flex-wrap items-center gap-4">

        <div className="flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 backdrop-blur-xl">

          <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />

          <p className="text-sm font-medium text-emerald-300">

            2,483 people exploring nightlife now

          </p>

        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-zinc-300 backdrop-blur-xl">

          🔥 42 trending events tonight

        </div>

      </div>

      {/* SEARCH */}

      <div className="mt-8 max-w-xl">

        <SearchBar
          search={search}
          setSearch={setSearch}
        />

      </div>

      {/* FILTERS */}

      <div className="mt-10 flex gap-3 overflow-x-auto pb-2">

        <button
          onClick={() => setSelectedCategory("All")}
          className={`rounded-full px-5 py-3 text-sm font-medium transition ${
            selectedCategory === "All"
              ? "bg-white text-black"
              : "border border-white/10 bg-white/5 text-white"
          }`}
        >
          All
        </button>

        <button
          onClick={() => setSelectedCategory("Techno")}
          className={`rounded-full px-5 py-3 text-sm font-medium transition ${
            selectedCategory === "Techno"
              ? "bg-white text-black"
              : "border border-white/10 bg-white/5 text-white"
          }`}
        >
          Techno
        </button>

        <button
          onClick={() => setSelectedCategory("Commercial")}
          className={`rounded-full px-5 py-3 text-sm font-medium transition ${
            selectedCategory === "Commercial"
              ? "bg-white text-black"
              : "border border-white/10 bg-white/5 text-white"
          }`}
        >
          Commercial
        </button>

      </div>

    </div>

    {/* RIGHT STATS */}

    <div className="grid gap-6 sm:grid-cols-2">

      <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

        <p className="text-sm uppercase tracking-wide text-zinc-500">

          Clubs listed

        </p>

        <h3 className="mt-4 text-5xl font-black text-white">

          120+

        </h3>

        <p className="mt-4 text-zinc-400">

          Discover premium nightlife venues across Barcelona.

        </p>

      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

        <p className="text-sm uppercase tracking-wide text-zinc-500">

          Monthly users

        </p>

        <h3 className="mt-4 text-5xl font-black text-white">

          48K

        </h3>

        <p className="mt-4 text-zinc-400">

          Thousands exploring nightlife experiences every month.

        </p>

      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl sm:col-span-2">

        <p className="text-sm uppercase tracking-wide text-zinc-500">

          Trending tonight

        </p>

        <h3 className="mt-4 text-4xl font-black text-white">

          Techno events dominating Barcelona nightlife.

        </h3>

        <p className="mt-4 max-w-xl text-zinc-400">

          Explore the most popular clubs, underground sessions and rooftop experiences happening tonight.

        </p>

      </div>

    </div>

  </div>

</div>

</section>

        {/* CLUB GRID */}

        <section className="mx-auto mt-14 max-w-7xl px-4">

          {filteredClubs.length > 0 ? (

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

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
                  />

                </div>

              ))}

            </div>

          ) : (

            <div className="flex flex-col items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.03] px-8 py-24 text-center backdrop-blur-xl">

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-4xl">

                🌙

              </div>

              <h3 className="mt-8 text-3xl font-black text-white">

                No nightlife found

              </h3>

              <p className="mt-4 max-w-md leading-relaxed text-zinc-400">

                Try searching for another club, area or music style in Barcelona nightlife.

              </p>

            </div>

          )}

        </section>

        {/* EVENTS */}

        <EventsSection />

        {/* AREAS */}

        <AreasSection />

      </main>

      <BottomNav />

    </>
  )
}