"use client"

import { useState } from "react"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import ClubCard from "../../components/nightlife/ClubCard"

import { nightlifeData } from "../../data/nightlife-data"

export default function ClubsPage() {

  const [selectedCategory, setSelectedCategory] = useState("All")

  const filters = [
    "All",
    "Techno",
    "Commercial",
    "VIP",
    "Terrace",
  ]

  const filteredClubs = nightlifeData.filter((club) => {

    return (

      selectedCategory === "All" ||

      (selectedCategory === "Techno" &&
        club.music === "Techno") ||

      (selectedCategory === "Commercial" &&
        club.music === "Commercial") ||

      (selectedCategory === "VIP" &&
        club.vip) ||

      (selectedCategory === "Terrace" &&
        club.terrace)
    )
  })

  return (

    <>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-14">

          <div className="mx-auto max-w-7xl">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              Clubs

            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">

              Explore Barcelona nightlife

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Discover curated nightlife experiences across Barcelona’s most iconic clubs and venues.

            </p>

          </div>

        </section>

        {/* FILTERS */}

        <section className="mx-auto mt-12 max-w-7xl px-4">

          <div className="flex gap-3 overflow-x-auto pb-2">

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

        </section>

        {/* GRID */}

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">

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

        </section>

      </main>

      <BottomNav />

    </>
  )
}