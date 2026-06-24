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
  const [openNow, setOpenNow] = useState(false)
  const [nearMe, setNearMe] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
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

  const isOpenNow = (hours: string): boolean => {
    if (!hours) return false

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }))
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const currentDay = now.getDay()

    const dayMap: Record<string, number> = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 }
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]

    const isDayActive = (daysStr: string): boolean => {
      const parts = daysStr.split("/")
      for (const part of parts) {
        if (part.includes("-")) {
          const [from, to] = part.split("-")
          const fromIdx = dayOrder.indexOf(dayMap[from])
          const toIdx = dayOrder.indexOf(dayMap[to])
          const currentIdx = dayOrder.indexOf(currentDay)
          if (fromIdx !== -1 && toIdx !== -1 && currentIdx !== -1) {
            if (fromIdx <= toIdx) {
              if (currentIdx >= fromIdx && currentIdx <= toIdx) return true
            } else {
              if (currentIdx >= fromIdx || currentIdx <= toIdx) return true
            }
          }
        } else {
          if (dayMap[part] === currentDay) return true
        }
      }
      return false
    }

    const periods = hours.split("|").map(s => s.trim())

    for (const period of periods) {
      const withDay = period.match(/^([LMXJVSD\/\-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
      const noDay = period.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/)

      if (withDay) {
        if (!isDayActive(withDay[1])) continue
        const startMin = parseInt(withDay[2].split(":")[0]) * 60 + parseInt(withDay[2].split(":")[1])
        const endMin = parseInt(withDay[3].split(":")[0]) * 60 + parseInt(withDay[3].split(":")[1])
        if (endMin < startMin) {
          if (currentMinutes >= startMin || currentMinutes <= endMin) return true
        } else {
          if (currentMinutes >= startMin && currentMinutes <= endMin) return true
        }
      } else if (noDay) {
        const startMin = parseInt(noDay[1].split(":")[0]) * 60 + parseInt(noDay[1].split(":")[1])
        const endMin = parseInt(noDay[2].split(":")[0]) * 60 + parseInt(noDay[2].split(":")[1])
        if (endMin < startMin) {
          if (currentMinutes >= startMin || currentMinutes <= endMin) return true
        } else {
          if (currentMinutes >= startMin && currentMinutes <= endMin) return true
        }
      }
    }
    return false
  }

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const neighborhoods = ["All", ...Array.from(new Set(clubs.map((c) => c.neighborhood).filter(Boolean))).sort()]

  const filteredClubs = clubs.filter((club) => {
    const allLabel = t("filters.all")
    const matchesCategory =
      selectedCategory === allLabel ||
      selectedCategory === "All" ||
      (selectedCategory === "Techno" && club.music?.toLowerCase().includes("techno")) ||
      (selectedCategory === "Commercial" && club.music?.toLowerCase().includes("commercial")) ||
      (selectedCategory === "Cocktail Bar" && club.music?.toLowerCase().includes("cocktail")) ||
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

    const matchesOpenNow = !openNow || isOpenNow(club.hours)

    const matchesNearMe = !nearMe || !userLat || !userLng || (
      club.latitude && club.longitude &&
      getDistance(userLat, userLng, club.latitude, club.longitude) <= 2
    )

    return matchesCategory && matchesNeighborhood && matchesSearch && matchesOpenNow && matchesNearMe
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

        {/* Tonight Mode + Near Me */}
        <section className="mx-auto mt-4 max-w-7xl px-4">
          <div className="flex gap-3">
            <button
              onClick={() => setOpenNow(!openNow)}
              className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                openNow
                  ? "bg-emerald-400 text-black"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              🟢 Abierto ahora
            </button>
            <button
              onClick={() => {
                if (!navigator.geolocation) return
                navigator.geolocation.getCurrentPosition((pos) => {
                  setUserLat(pos.coords.latitude)
                  setUserLng(pos.coords.longitude)
                  setNearMe(true)
                })
              }}
              className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                nearMe
                  ? "bg-purple-500 text-white"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              📍 Cerca de mí
            </button>
            {nearMe && (
              <button
                onClick={() => { setNearMe(false); setUserLat(null); setUserLng(null) }}
                className="rounded-full px-5 py-3 text-sm font-bold border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
              >
                ✕
              </button>
            )}
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
                  verified={club.verified}
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