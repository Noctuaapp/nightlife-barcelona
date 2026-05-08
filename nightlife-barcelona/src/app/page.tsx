"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"

import ClubCard from "../components/nightlife/ClubCard"

import SearchBar from "../components/ui/SearchBar"

import EventsSection from "../components/home/EventsSection"
import AreasSection from "../components/home/AreasSection"

import { nightlifeData } from "../data/nightlife-data"

export default function Home() {

  const router = useRouter()

  const [selectedCategory, setSelectedCategory] =
    useState("All")

  const [search, setSearch] = useState("")

  const filters = [
    "All",
    "Techno",
    "Commercial",
    "VIP",
  ]

  const safeClubs = nightlifeData.filter(
    (club) => club && club.name
  )

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
  }

  const handleSearch = () => {

    if (!search.trim()) return

    const foundClub = safeClubs.find((club) =>

      club.name
        .toLowerCase()
        .includes(search.toLowerCase())

    )

    if (foundClub) {

      router.push(
        `/clubs/${createSlug(foundClub.name)}`
      )

    }

  }

  const filteredClubs = safeClubs.filter((club) => {

    const matchesCategory =

      selectedCategory === "All" ||

      (selectedCategory === "Techno" &&
        club.music === "Techno") ||

      (selectedCategory === "Commercial" &&
        club.music === "Commercial") ||

      (selectedCategory === "VIP" &&
        club.vip)

    const matchesSearch =

      club.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||

      club.neighborhood
        .toLowerCase()
        .includes(search.toLowerCase()) ||

      club.music
        .toLowerCase()
        .includes(search.toLowerCase())

    return matchesCategory && matchesSearch

  })

  return (

    <>

      {/* BACKGROUND */}

      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute left-[-200px] top-[-200px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] right-[-200px] h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-3xl" />

      </div>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="relative h-[92vh] overflow-hidden">

          <img
            src="/hero/barcelona-night.jpg"
            alt="Barcelona nightlife skyline"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/60" />

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black" />

          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20 blur-3xl" />

          <div className="relative z-10 flex h-full items-center px-4">

            <div className="mx-auto max-w-7xl">

              <div className="max-w-4xl">

                <p className="mb-5 text-sm uppercase tracking-[0.4em] text-zinc-300">

                  Barcelona nightlife intelligence

                </p>

                <h1 className="text-6xl font-black leading-none tracking-tight text-white md:text-8xl">

                  Discover Barcelona after dark.

                </h1>

                <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-300 md:text-xl">

                  Real-time nightlife discovery,
                  trending venues, live queues
                  and the best nights in Barcelona.

                </p>

                <div className="mt-10 max-w-xl">

                  <SearchBar
                    search={search}
                    setSearch={setSearch}
                    onSearch={handleSearch}
                  />

                </div>

                <div className="mt-8 flex flex-wrap gap-4">

                  <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white backdrop-blur-xl">

                    🔥 Live nightlife

                  </div>

                  <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white backdrop-blur-xl">

                    🌍 Barcelona clubs

                  </div>

                  <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white backdrop-blur-xl">

                    ⏳ Real-time queues

                  </div>

                </div>

              </div>

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
                onClick={() =>
                  setSelectedCategory(filter)
                }
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

        <EventsSection />

        <AreasSection />

      </main>

      <BottomNav />

    </>
  )
}