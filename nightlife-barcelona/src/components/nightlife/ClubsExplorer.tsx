"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import ClubCard from "./ClubCard"
import { useLanguage } from "../../context/LanguageContext"

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={style}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  )
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const GENRE_FILTERS = ["Techno", "Commercial", "Cocktail Bar"]
const ATTRIBUTE_FILTERS = ["Trending", "LGTBI+", "Sin cola"]
const AGE_FILTERS = ["+18", "+21", "+25"]
const PAGE_SIZE = 9

export default function ClubsExplorer({ initialClubs }: { initialClubs: any[] }) {
  const [clubs] = useState<any[]>(initialClubs)
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set())
  const [selectedAges, setSelectedAges] = useState<Set<string>>(new Set())
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [openNow, setOpenNow] = useState(false)
  const [nearMe, setNearMe] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<"recommended" | "rating" | "name" | "distance">("recommended")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { t } = useLanguage()

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, search, openNow, nearMe, sortBy])

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

    const periods = hours.split("|").map((s) => s.trim())

    for (const period of periods) {
      const withDay = period.match(/^([LMXJVSD/\-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
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
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const genreMatch = (club: any, g: string) => {
    if (g === "Techno") return club.music?.toLowerCase().includes("techno")
    if (g === "Commercial") return club.music?.toLowerCase().includes("commercial")
    if (g === "Cocktail Bar") return club.music?.toLowerCase().includes("cocktail")
    return false
  }

  const attributeMatch = (club: any, a: string) => {
    if (a === "Trending") return club.trending === true
    if (a === "LGTBI+") return club.lgtbi_friendly === true
    if (a === "Sin cola") return club.queue === "No queue" || !club.queue
    return false
  }

  const ageMatch = (club: any, age: string) => {
    if (age === "+18") return club.age_min === 18
    if (age === "+21") return club.age_min === 21
    if (age === "+25") return club.age_min === 25
    return false
  }

  const neighborhoods = Array.from(new Set(clubs.map((c) => c.neighborhood).filter(Boolean))).sort()

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesGenre = selectedGenres.size === 0 || Array.from(selectedGenres).some((g) => genreMatch(club, g))
      const matchesAttributes = Array.from(selectedAttributes).every((a) => attributeMatch(club, a))
      const matchesAge = selectedAges.size === 0 || Array.from(selectedAges).some((age) => ageMatch(club, age))
      const matchesNeighborhood = selectedNeighborhoods.size === 0 || selectedNeighborhoods.has(club.neighborhood)

      const matchesSearch =
        search === "" ||
        club.name?.toLowerCase().includes(search.toLowerCase()) ||
        club.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
        club.music?.toLowerCase().includes(search.toLowerCase())

      const matchesOpenNow = !openNow || isOpenNow(club.hours)

      const matchesNearMe =
        !nearMe ||
        !userLat ||
        !userLng ||
        (club.latitude && club.longitude && getDistance(userLat, userLng, club.latitude, club.longitude) <= 2)

      return matchesGenre && matchesAttributes && matchesAge && matchesNeighborhood && matchesSearch && matchesOpenNow && matchesNearMe
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, search, openNow, nearMe, userLat, userLng])

  const sortedClubs = useMemo(() => {
    const arr = [...filteredClubs]
    if (sortBy === "rating") arr.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (sortBy === "name") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    else if (sortBy === "distance" && userLat && userLng) {
      arr.sort((a, b) => {
        const da = a.latitude && a.longitude ? getDistance(userLat, userLng, a.latitude, a.longitude) : Infinity
        const db = b.latitude && b.longitude ? getDistance(userLat, userLng, b.latitude, b.longitude) : Infinity
        return da - db
      })
    }
    return arr
  }, [filteredClubs, sortBy, userLat, userLng])

  const visibleClubs = sortedClubs.slice(0, visibleCount)

  const activeFilters: { label: string; onRemove: () => void }[] = [
    ...Array.from(selectedGenres).map((g) => ({ label: g, onRemove: () => setSelectedGenres((s) => toggleInSet(s, g)) })),
    ...Array.from(selectedAttributes).map((a) => ({ label: a, onRemove: () => setSelectedAttributes((s) => toggleInSet(s, a)) })),
    ...Array.from(selectedAges).map((age) => ({ label: age, onRemove: () => setSelectedAges((s) => toggleInSet(s, age)) })),
    ...Array.from(selectedNeighborhoods).map((n) => ({ label: n, onRemove: () => setSelectedNeighborhoods((s) => toggleInSet(s, n)) })),
  ]
  if (openNow) activeFilters.push({ label: "🟢 Abierto ahora", onRemove: () => setOpenNow(false) })
  if (nearMe)
    activeFilters.push({
      label: "📍 Cerca de mí",
      onRemove: () => {
        setNearMe(false)
        setUserLat(null)
        setUserLng(null)
      },
    })
  if (search) activeFilters.push({ label: `"${search}"`, onRemove: () => setSearch("") })

  const clearAll = () => {
    setSelectedGenres(new Set())
    setSelectedAttributes(new Set())
    setSelectedAges(new Set())
    setSelectedNeighborhoods(new Set())
    setOpenNow(false)
    setNearMe(false)
    setUserLat(null)
    setUserLng(null)
    setSearch("")
  }

  const requestNearMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLat(pos.coords.latitude)
      setUserLng(pos.coords.longitude)
      setNearMe(true)
    })
  }

  const activeFilterCount = selectedGenres.size + selectedAttributes.size + selectedAges.size + selectedNeighborhoods.size

  const ChipGroup = ({
    title,
    options,
    selected,
    onToggle,
  }: {
    title: string
    options: string[]
    selected: Set<string>
    onToggle: (value: string) => void
  }) => (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition ${
              selected.has(opt)
                ? "bg-white text-black"
                : "border border-white/10 bg-white/[0.04] text-white hover:border-purple-400/30 hover:bg-white/[0.08]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <main className="relative min-h-screen pb-40 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-[float_18s_ease-in-out_infinite]" />
          <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[130px] animate-[float_22s_ease-in-out_infinite_reverse]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("clubs.title")}</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-white md:text-6xl">{t("clubs.subtitle")}</h1>
          </div>
        </section>

        {/* STICKY SEARCH + QUICK ACTIONS */}
        <div className="sticky top-0 z-30 mt-8 border-y border-white/10 bg-black/70 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4">
            <div className="group flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3.5 backdrop-blur-xl transition focus-within:border-purple-400/50 focus-within:bg-white/[0.08]">
              <span className="text-zinc-500 transition group-focus-within:text-purple-300">🔍</span>
              <input
                type="text"
                placeholder={t("clubs.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-500 transition hover:text-white" aria-label="Limpiar búsqueda">
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setOpenNow(!openNow)}
              className={`shrink-0 rounded-full px-4 py-3.5 text-sm font-bold transition ${
                openNow ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              🟢 Ahora
            </button>
            <button
              onClick={nearMe ? () => { setNearMe(false); setUserLat(null); setUserLng(null) } : requestNearMe}
              className={`shrink-0 rounded-full px-4 py-3.5 text-sm font-bold transition ${
                nearMe ? "bg-purple-500 text-white" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              📍 Cerca
            </button>
            <button
              onClick={() => setSelectedAttributes((s) => toggleInSet(s, "Trending"))}
              className={`shrink-0 rounded-full px-4 py-3.5 text-sm font-bold transition ${
                selectedAttributes.has("Trending") ? "bg-orange-400 text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              🔥 Trending
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-medium text-white outline-none"
            >
              <option value="recommended" className="bg-black">Recomendado</option>
              <option value="rating" className="bg-black">⭐ Mejor valorados</option>
              <option value="name" className="bg-black">A-Z</option>
              {nearMe && <option value="distance" className="bg-black">📍 Más cercanos</option>}
            </select>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`shrink-0 rounded-full px-5 py-3.5 text-sm font-bold transition ${
                filtersOpen ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              ☰ Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-2 px-4">
              {activeFilters.map((f, i) => (
                <button
                  key={`${f.label}-${i}`}
                  onClick={f.onRemove}
                  className="flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-400/20"
                >
                  {f.label} <span className="text-purple-300">✕</span>
                </button>
              ))}
              <button onClick={clearAll} className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:text-white hover:underline">
                Limpiar todo
              </button>
            </div>
          )}
        </div>

        {/* ADVANCED FILTERS PANEL — todos multi-selección y combinables entre sí */}
        {filtersOpen && (
          <section className="mx-auto max-w-7xl px-4 pt-6">
            <div className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <ChipGroup
                title="Estilo (elige varios)"
                options={GENRE_FILTERS}
                selected={selectedGenres}
                onToggle={(v) => setSelectedGenres((s) => toggleInSet(s, v))}
              />
              <ChipGroup
                title="Ambiente"
                options={ATTRIBUTE_FILTERS}
                selected={selectedAttributes}
                onToggle={(v) => setSelectedAttributes((s) => toggleInSet(s, v))}
              />
              <ChipGroup
                title="Edad mínima"
                options={AGE_FILTERS}
                selected={selectedAges}
                onToggle={(v) => setSelectedAges((s) => toggleInSet(s, v))}
              />
              <ChipGroup
                title="📍 Barrio (elige varios)"
                options={neighborhoods}
                selected={selectedNeighborhoods}
                onToggle={(v) => setSelectedNeighborhoods((s) => toggleInSet(s, v))}
              />
            </div>
          </section>
        )}

        {/* Results count */}
        <section className="mx-auto max-w-7xl px-4 pt-8">
          <p className="text-sm text-zinc-500">
            {sortedClubs.length} {sortedClubs.length === 1 ? "club encontrado" : "clubs encontrados"}
          </p>
        </section>

        {/* Results */}
        <section className="mx-auto mt-4 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleClubs.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <p className="text-lg font-bold text-zinc-300">No hay clubs con estos filtros</p>
              <p className="mt-2 text-sm text-zinc-500">Prueba a quitar algún filtro o busca otro barrio.</p>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearAll}
                  className="mt-6 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            visibleClubs.map((club, index) => (
              <Reveal key={club.id} style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}>
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
                  vip={club.vip_tables}
                  smokingArea={club.smoking_area}
                  tableBooking={club.table_booking}
                  dresscode={club.dresscode}
                  lgtbi_friendly={club.lgtbi_friendly}
                  verified={club.verified}
                />
              </Reveal>
            ))
          )}
        </section>

        {visibleCount < sortedClubs.length && (
          <div className="mt-12 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-2xl border border-white/15 bg-white/[0.03] px-8 py-4 font-bold text-white transition hover:bg-white hover:text-black"
            >
              Mostrar más ({sortedClubs.length - visibleCount} más)
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -20px) scale(1.08);
          }
        }
      `}</style>
    </>
  )
}