"use client"

import { useState, useEffect } from "react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import ClubCard from "../../components/nightlife/ClubCard"
import { supabase } from "../../lib/supabase"

export default function ClubsPage() {
  const [clubs, setClubs] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [loading, setLoading] = useState(true)

  const filters = ["All", "Techno", "Commercial", "Cocktail Bar", "Trending"]

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from("clubs").select("*")
      if (data) setClubs(data)
      setLoading(false)
    }
    fetchClubs()
  }, [])

  const filteredClubs = clubs.filter((club) => {
    if (selectedCategory === "All") return true
    if (selectedCategory === "Techno") return club.music === "Techno"
    if (selectedCategory === "Commercial") return club.music === "Commercial"
    if (selectedCategory === "Cocktail Bar") return club.music === "Cocktail Bar"
    if (selectedCategory === "Trending") return club.trending === true
    return true
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Clubs</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              Explore Barcelona nightlife
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Discover curated nightlife experiences across Barcelona's most iconic clubs and venues.
            </p>
          </div>
        </section>

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

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">Loading clubs...</p>
          ) : filteredClubs.length === 0 ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">No clubs found.</p>
          ) : (
            filteredClubs.map((club, index) => (
              <div key={club.id} className="fade-up" style={{ animationDelay: `${index * 0.08}s` }}>
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
                  smokingArea={club.smoking_area}
                  tableBooking={club.table_booking}
                  dresscode={club.dresscode}
                />
              </div>
            ))
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}