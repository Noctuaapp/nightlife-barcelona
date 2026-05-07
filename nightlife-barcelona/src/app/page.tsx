"use client"

import { useState } from "react"
import Header from "../components/layout/Header"
import ClubCard from "../components/nightlife/ClubCard"
import { nightlifeData } from "../data/nightlife-data"
import SearchBar from "../components/ui/SearchBar"
import BottomNav from "../components/layout/BottomNav"

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
      <main className="min-h-screen bg-black pb-32 text-white">

        <Header />

        <section className="px-4 pt-8">

          <div className="mx-auto max-w-7xl">

            <div className="mb-8">

              <p className="mb-2 text-sm uppercase tracking-widest text-zinc-500">
                Barcelona nightlife
              </p>

              <h1 className="max-w-2xl text-4xl font-bold leading-tight">
                Discover clubs, events and nightlife around you.
              </h1>

              <p className="mt-4 max-w-xl text-zinc-400">
                Find the best nightlife spots in Barcelona — clubs, bars,
                rooftops, festivals and late-night services in one place.
              </p>

              <SearchBar
                search={search}
                setSearch={setSearch}
              />

            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">

              <button
                onClick={() => setSelectedCategory("All")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selectedCategory === "All"
                    ? "bg-white text-black"
                    : "border border-zinc-700 text-white"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setSelectedCategory("Techno")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selectedCategory === "Techno"
                    ? "bg-white text-black"
                    : "border border-zinc-700 text-white"
                }`}
              >
                Techno
              </button>

              <button
                onClick={() => setSelectedCategory("Commercial")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selectedCategory === "Commercial"
                    ? "bg-white text-black"
                    : "border border-zinc-700 text-white"
                }`}
              >
                Commercial
              </button>

            </div>

          </div>

        </section>

        <section className="mx-auto mt-8 grid max-w-7xl gap-6 px-4 md:grid-cols-2 xl:grid-cols-3">

          {filteredClubs.map((club) => (
            <ClubCard
              key={club.id}
              name={club.name}
              music={club.music}
              area={club.neighborhood}
              price={club.price}
              hours={club.hours}
              image={club.image}
            />
          ))}

        </section>

      </main>

      <BottomNav />
    </>
  )
}