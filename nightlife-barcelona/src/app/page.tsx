"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"
import Footer from "../components/layout/Footer"
import ClubCard from "../components/nightlife/ClubCard"

import SearchBar from "../components/ui/SearchBar"

import EventsSection from "../components/home/EventsSection"
import AreasSection from "../components/home/AreasSection"

import { supabase } from "../lib/supabase"

export default function Home() {

  const router = useRouter()

  const [clubs, setClubs] = useState<any[]>([])

  const [selectedCategory, setSelectedCategory] =
    useState("All")

  const [search, setSearch] = useState("")

  useEffect(() => {

    const fetchClubs = async () => {

      const { data, error } = await supabase.from("clubs").select("*").eq("hidden", false)

      console.log("DATA:", data)
      console.log("ERROR:", error)

      if (data) {
        setClubs(data)
      }

    }

    fetchClubs()

  }, [])

  const filters = [
    "All",
    "Techno",
    "Commercial",
    "VIP",
  ]

  const handleSearch = () => {

    if (!search.trim()) return

    const foundClub = clubs.find((club) =>
      club.name
        ?.toLowerCase()
        .includes(search.toLowerCase())
    )

    if (foundClub) {

      const slug = foundClub.name
        .toLowerCase()
        .replace(/\s+/g, "-")

      router.push(`/clubs/${slug}`)

    }

  }

  const filteredClubs = clubs.filter((club) => {

    if (!club) return false

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
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

      club.neighborhood
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

      club.music
        ?.toLowerCase()
        .includes(search.toLowerCase())

    return matchesCategory && matchesSearch

  }).slice(0, 6)

  return (

    <>

      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute left-[-200px] top-[-200px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] right-[-200px] h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-3xl" />

      </div>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="relative h-[92vh] overflow-hidden">

          <img
            src="/hero/skyline_barcelona.jpeg"
            alt="Barcelona nightlife skyline"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/30" />

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black" />

          <div className="relative z-10 flex h-full items-end px-6 pb-20">

            <div className="w-full max-w-7xl">

              <div className="max-w-2xl">

                <p className="mb-5 text-sm uppercase tracking-[0.4em] text-zinc-300">

                  Noctua Nightlife 

                </p>

                <h1 className="text-6xl font-black leading-none tracking-tight text-white md:text-8xl">

                  Descubre Barcelona al anochecer...

                </h1>
                
                <div className="mt-10 max-w-xs">

                  <SearchBar
                    search={search}
                    setSearch={setSearch}
                    onSearch={handleSearch}
                  />

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
        <div className="mt-10 flex justify-center">
            <a href="/clubs" className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10">
              Explore all clubs →
            </a>
          </div>
        <EventsSection />

        <AreasSection />

        <div className="h-screen" />

<Footer />

      </main>

      <BottomNav />

    </>
  )
}