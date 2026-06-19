"use client"

import { useState, useEffect } from "react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import ClubCard from "../../components/nightlife/ClubCard"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

export default function ClubsPage() {
  const [clubs, setClubs] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  const filters = [t("filters.all"), "Techno", "Commercial", "Cocktail Bar", "Trending", "LGTBI+", "+18", "+21", "+25"]

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from("clubs").select("*").eq("hidden", false)
      if (data) setClubs(data)
      setLoading(false)
    }
    fetchClubs()
  }, [])

  const neighborhoods = ["All", ...Array.from(new Set(clubs.map((c) => c.neighborhood).filter(Boolean))).sort()]

  const filteredClubs = clubs.filter((club) => {
    const allLabel = t("filters.all")
    const matchesCategory =
      selectedCategory === allLabel ||
      selectedCategory === "All" ||
      (selectedCategory === "Techno" && club.music === "Techno") ||
      (selectedCategory === "Commercial" && club.music === "Commercial") ||
      (selectedCategory === "Cocktail Bar" && club.music === "Cocktail Bar") ||
      (selectedCategory === "Trending" && club.trending === true) ||
      (selectedCategory === "LGTBI+" && club.lgtbi_friendly === true) ||
      (selectedCategory === "+18" && club.age_min === 18) ||
      (selectedCategory === "+21" && club.age_min === 21) ||
      (selectedCategory === "+25" && club.age_min === 25)

    const matchesNeighborhood =
      selectedNeighborhood === "All" ||
      club.neighborhood === selectedNeighborhood

    const matchesSearch =
      search === "" ||
      club.name?.toLowerCase().includes(search.toLowerCase()) ||
      club.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
      club.music?.toLowerCase().includes(search.toLowerCase())

    return matchesCategory && matchesNeighborhood && matchesSearch
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("clubs.title")}</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              {t("clubs.subtitle")}
            </h1>
          </div>
        </section>

        {/* Search */}
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="relative max-w-xl">
            <input
              type="text"
              placeholder={t("clubs.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "14px 44px 14px 48px",
                fontSize: "14px",
                color: "#fff",
                outline: "none",
              }}
            />
            <svg
              style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="18" height="18" viewBox="0 0 24 24" fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Music Filters */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">{t("clubs.title")}</p>
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

        {/* Neighborhood Filters */}
        <section className="mx-auto mt-4 max-w-7xl px-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">📍 Barrio</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {neighborhoods.map((n) => (
              <button
                key={n}
                onClick={() => setSelectedNeighborhood(n)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  selectedNeighborhood === n
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Results */}
        <section className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">{t("common.loading")}</p>
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
                  lgtbi_friendly={club.lgtbi_friendly}
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