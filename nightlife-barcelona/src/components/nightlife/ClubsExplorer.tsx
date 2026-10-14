"use client"

import { zoneOf, zonesPresent } from "../../lib/zones"
import { clubOpenNow } from "../../lib/clubHours"
import { useEffect, useMemo, useState } from "react"
import ClubCard from "./ClubCard"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"
import { useLanguage } from "../../context/LanguageContext"
import { SearchIcon, CloseIcon, LocationIcon, FlameIcon, SlidersIcon, ChevronDownIcon } from "../ui/FilterIcons"
import ExploreSwitch from "./ExploreSwitch"
import { STYLES } from "../../lib/areas"

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

// Antes los estilos eran "Techno", "Commercial" y "Cocktail Bar" y se buscaban en inglés dentro de
// la columna music, que está en español ("Comercial"): el filtro "Commercial" casi nunca encontraba
// nada. Ahora usa los mismos estilos que las páginas /musica (src/lib/areas.ts).
const GENRE_FILTERS = STYLES.filter((s) => s.slug !== "electronica").map((s) => s.slug)
const ATTRIBUTE_FILTERS = ["trending", "lgtbi", "noQueue", "games", "discount", "free", "over30"]
const AGE_FILTERS = ["+18", "+21", "+25"]
const PAGE_SIZE = 9

// Búsqueda sin tildes ni mayúsculas, con puntuación de relevancia: antes "ku" devolvía cualquier
// club que contuviera "ku" en cualquier parte (Marku, Sakura...) en el orden por defecto, así
// que el club buscado salía el segundo o el décimo. Ahora el nombre exacto va primero, luego
// los que empiezan por la búsqueda, luego los que tienen una palabra que empieza así, etc.
const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()

function searchScore(club: any, rawQuery: string): number {
  const q = norm(rawQuery)
  if (!q) return 1
  const name = norm(club.name)
  const hood = norm(club.neighborhood)
  const music = norm(club.music)
  const short = q.length < 3
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  if (name.split(" ").some((w) => w.startsWith(q))) return 60
  if (!short && name.includes(q)) return 40
  if (hood === q || hood.startsWith(q)) return 25
  if (!short && hood.includes(q)) return 20
  if (music.split(/[\s,]+/).some((w) => w.startsWith(q))) return 10
  return 0
}

// Grupo de chips de un filtro. Fuera del componente: definido dentro se volvía a crear en cada
// render y React desmontaba los botones (se perdía el foco al pulsar).
const ChipGroup = ({
  title,
  options,
  selected,
  onToggle,
  label = (v: string) => v,
}: {
  title: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  label?: (value: string) => string
}) => (
  <div>
    <p className="mb-3 text-sm font-semibold text-zinc-300">{title}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          aria-pressed={selected.has(opt)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
            selected.has(opt) ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:border-white/30 hover:bg-white/5"
          }`}
        >
          {label(opt)}
        </button>
      ))}
    </div>
  </div>
)

export default function ClubsExplorer({ initialClubs }: { initialClubs: any[] }) {
  const [clubs] = useState<any[]>(initialClubs)
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set())
  const [selectedAges, setSelectedAges] = useState<Set<string>>(new Set())
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set())
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [openNow, setOpenNow] = useState(false)
  const [nearMe, setNearMe] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [nearMeLoading, setNearMeLoading] = useState(false)
  const [nearMeError, setNearMeError] = useState("")
  // Edad aproximada del usuario (si ha indicado año de nacimiento): en el orden "recomendado",
  // a partir de 30 años suben primero las discotecas de público +30/+40.
  const [userAge, setUserAge] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data: prof } = await supabase.from("profiles").select("birth_year").eq("id", auth.user.id).maybeSingle()
      if (!cancelled && prof?.birth_year) setUserAge(new Date().getFullYear() - Number(prof.birth_year))
    })()
    return () => { cancelled = true }
  }, [])
  const [sortBy, setSortBy] = useState<"recommended" | "rating" | "name" | "distance">("recommended")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { t } = useLanguage()

  // La búsqueda de la home navega a /clubs?search=...; antes ese parámetro se ignoraba.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const q = params.get("search")
      if (q) setSearch(q)
      // "Ver todos" desde "Abierto ahora" de la portada llega con ?open=1.
      if (params.get("open") === "1") setOpenNow(true)
    } catch {}
  }, [])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, selectedZones, search, openNow, nearMe, sortBy])

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
    const style = STYLES.find((s) => s.slug === g)
    return !!style && typeof club.music === "string" && style.rx.test(club.music)
  }
  const styleLabel = (g: string) => {
    const v = t(`areas.style.${g}`)
    return v.charAt(0).toUpperCase() + v.slice(1)
  }

  const attributeMatch = (club: any, a: string) => {
    if (a === "trending") return club.trending === true
    if (a === "lgtbi") return club.lgtbi_friendly === true
    if (a === "noQueue") return club.queue === "No queue" || !club.queue
    if (a === "games") return club.has_foosball === true
    if (a === "discount") return !!club.discount_info
    if (a === "free") return !!club.free_entry_info
    if (a === "over30") return club.audience === "+30" || club.audience === "+40"
    return false
  }
  const attrLabel = (a: string) => t(`explorer.attr_${a}`)

  const ageMatch = (club: any, age: string) => {
    if (age === "+18") return club.age_min === 18
    if (age === "+21") return club.age_min === 21
    if (age === "+25") return club.age_min === 25
    return false
  }

  const availableZones = zonesPresent(clubs)
  // Los barrios que se ofrecen dependen de la zona elegida (con cientos de locales, una lista plana es inmanejable).
  const neighborhoods = Array.from(
    new Set(
      clubs
        .filter((c) => selectedZones.size === 0 || selectedZones.has(zoneOf(c)))
        .map((c) => c.neighborhood)
        .filter(Boolean)
    )
  ).sort() as string[]

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesGenre = selectedGenres.size === 0 || Array.from(selectedGenres).some((g) => genreMatch(club, g))
      const matchesAttributes = Array.from(selectedAttributes).every((a) => attributeMatch(club, a))
      const matchesAge = selectedAges.size === 0 || Array.from(selectedAges).some((age) => ageMatch(club, age))
      const matchesNeighborhood = selectedNeighborhoods.size === 0 || selectedNeighborhoods.has(club.neighborhood)
      const matchesZone = selectedZones.size === 0 || selectedZones.has(zoneOf(club))

      const matchesSearch = searchScore(club, search) > 0

      const matchesOpenNow = !openNow || clubOpenNow(club.hours, club.open_days) === true

      const matchesNearMe =
        !nearMe ||
        !userLat ||
        !userLng ||
        (club.latitude && club.longitude && getDistance(userLat, userLng, club.latitude, club.longitude) <= 2)

      return matchesGenre && matchesAttributes && matchesAge && matchesNeighborhood && matchesZone && matchesSearch && matchesOpenNow && matchesNearMe
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, selectedZones, search, openNow, nearMe, userLat, userLng])

  const sortedClubs = useMemo(() => {
    const arr = [...filteredClubs]
    if (search.trim() && sortBy === "recommended") {
      arr.sort((a, b) => searchScore(b, search) - searchScore(a, search))
      return arr
    }
    if (sortBy === "recommended" && userAge !== null && userAge >= 30) {
      const boost = (c: any) => (c.audience === "+30" || c.audience === "+40" ? 1 : 0)
      arr.sort((a, b) => boost(b) - boost(a))
      return arr
    }
    if (sortBy === "rating") arr.sort((a, b) => (Number(b.google_rating || b.rating) || 0) - (Number(a.google_rating || a.rating) || 0))
    else if (sortBy === "name") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    else if (sortBy === "distance" && userLat && userLng) {
      arr.sort((a, b) => {
        const da = a.latitude && a.longitude ? getDistance(userLat, userLng, a.latitude, a.longitude) : Infinity
        const db = b.latitude && b.longitude ? getDistance(userLat, userLng, b.latitude, b.longitude) : Infinity
        return da - db
      })
    }
    return arr
  }, [filteredClubs, sortBy, userLat, userLng, search, userAge])

  const visibleClubs = sortedClubs.slice(0, visibleCount)

  // Analítica de búsquedas del listado: qué se busca y cuántos resultados da (0 = demanda sin cubrir).
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) return
    const timeout = setTimeout(() => {
      track("search", { itemType: "club", itemName: q.toLowerCase().slice(0, 80), resultsCount: sortedClubs.length })
    }, 1500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const activeFilters: { label: string; onRemove: () => void }[] = [
    ...Array.from(selectedGenres).map((g) => ({ label: styleLabel(g), onRemove: () => setSelectedGenres((s) => toggleInSet(s, g)) })),
    ...Array.from(selectedAttributes).map((a) => ({ label: attrLabel(a), onRemove: () => setSelectedAttributes((s) => toggleInSet(s, a)) })),
    ...Array.from(selectedAges).map((age) => ({ label: age, onRemove: () => setSelectedAges((s) => toggleInSet(s, age)) })),
    ...Array.from(selectedZones).map((z) => ({ label: z, onRemove: () => setSelectedZones((s) => toggleInSet(s, z)) })),
    ...Array.from(selectedNeighborhoods).map((n) => ({ label: n, onRemove: () => setSelectedNeighborhoods((s) => toggleInSet(s, n)) })),
  ]
  if (openNow) activeFilters.push({ label: t("explorer.now"), onRemove: () => setOpenNow(false) })
  if (nearMe)
    activeFilters.push({
      label: t("explorer.near"),
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
    setSelectedZones(new Set())
    setOpenNow(false)
    setNearMe(false)
    setUserLat(null)
    setUserLng(null)
    setSearch("")
  }

  // Antes esto no tenía callback de error ni estado de carga: si el móvil denegaba el permiso,
  // tardaba (GPS en frío dentro de un local puede tardar bastante) o el navegador bloqueaba la
  // geolocalización por no estar en un gesto directo del usuario, el botón "Cerca" simplemente
  // no hacía nada — parecía roto, sin ningún mensaje. Ahora hay carga visible, mensaje de error
  // explicado (incluyendo qué hacer) y un timeout para no dejarlo colgado indefinidamente.
  const requestNearMe = () => {
    setNearMeError("")
    if (!navigator.geolocation) {
      setNearMeError(t("geo.unsupported"))
      return
    }
    setNearMeLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setNearMe(true)
        setNearMeLoading(false)
      },
      (err) => {
        setNearMeLoading(false)
        if (err.code === err.PERMISSION_DENIED) setNearMeError(t("geo.denied"))
        else if (err.code === err.TIMEOUT) setNearMeError(t("geo.timeout"))
        else setNearMeError(t("geo.error"))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const activeFilterCount = selectedGenres.size + selectedAttributes.size + selectedAges.size + selectedNeighborhoods.size + selectedZones.size

  const quick = (active: boolean) =>
    `flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
      active ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
    }`

  return (
    <>
      <main className="relative min-h-screen bg-night pb-16 text-ink">

        <section className="px-4 pt-8 sm:pt-12">
          <div className="mx-auto max-w-7xl">
            <ExploreSwitch active="clubs" />
            <h1 className="font-display mt-6 break-words text-[2rem] leading-[1.06] text-ink sm:text-5xl md:text-6xl">{t("clubs.subtitle")}</h1>
          </div>
        </section>

        {/* Búsqueda + accesos rápidos. En móvil la búsqueda ocupa toda la fila y los botones
            van en una fila deslizable (antes se partían en tres líneas y tapaban media pantalla). */}
        <div className="sticky top-[72px] z-30 sm:top-20 mt-6 border-y border-white/10 bg-night/90 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 lg:flex-row lg:items-center">
            <div className="group flex min-w-0 flex-1 items-center gap-3 rounded-full border border-white/15 bg-surface px-5 py-3 transition focus-within:border-brand">
              <SearchIcon className="h-5 w-5 shrink-0 text-zinc-400 transition group-focus-within:text-brand-soft" />
              <input
                type="search"
                placeholder={t("clubs.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t("clubs.search")}
                className="w-full bg-transparent text-base text-ink outline-none placeholder:text-zinc-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-400 transition hover:text-ink" aria-label={t("explorer.clearSearch")}>
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0">
              <button onClick={() => setOpenNow(!openNow)} aria-pressed={openNow} className={quick(openNow)}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${openNow ? "bg-white" : "bg-open"}`} />
                {t("explorer.now")}
              </button>
              <button
                onClick={nearMe ? () => { setNearMe(false); setUserLat(null); setUserLng(null) } : requestNearMe}
                disabled={nearMeLoading}
                aria-pressed={nearMe}
                className={quick(nearMe)}
              >
                <LocationIcon className="h-4 w-4" />
                {nearMeLoading ? t("explorer.locating") : t("explorer.near")}
              </button>
              <button
                onClick={() => setSelectedAttributes((s) => toggleInSet(s, "trending"))}
                aria-pressed={selectedAttributes.has("trending")}
                className={quick(selectedAttributes.has("trending"))}
              >
                <FlameIcon className="h-4 w-4" />
                {t("explorer.trending")}
              </button>
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  aria-label={t("explorer.sortLabel")}
                  className="appearance-none rounded-full border border-white/10 bg-night py-2.5 pl-4 pr-9 text-sm font-semibold text-zinc-200 outline-none"
                >
                  <option value="recommended">{t("explorer.sortRecommended")}</option>
                  <option value="rating">{t("explorer.sortRating")}</option>
                  <option value="name">{t("explorer.sortName")}</option>
                  {nearMe && <option value="distance">{t("explorer.sortDistance")}</option>}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
              <button onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} className={quick(filtersOpen)}>
                <SlidersIcon className="h-4 w-4" />
                {t("explorer.filters")}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>

          {nearMeError && <p className="mx-auto mt-3 max-w-7xl px-4 text-sm font-semibold text-red-300">{nearMeError}</p>}

          {activeFilters.length > 0 && (
            <div className="mx-auto mt-3 flex max-w-7xl flex-wrap items-center gap-2 px-4">
              {activeFilters.map((f, i) => (
                <button
                  key={`${f.label}-${i}`}
                  onClick={f.onRemove}
                  className="flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand-soft transition hover:bg-brand/25"
                >
                  {f.label} <CloseIcon className="h-3 w-3" />
                </button>
              ))}
              <button onClick={clearAll} className="text-xs font-semibold text-zinc-400 underline-offset-2 hover:text-ink hover:underline">
                {t("explorer.clearAll")}
              </button>
            </div>
          )}
        </div>

        {/* Panel de filtros: todos multi-selección y combinables. Anima su altura al abrirse. */}
        <section
          className={`mx-auto grid max-w-7xl px-4 transition-[grid-template-rows,opacity] duration-300 ease-out ${
            filtersOpen ? "grid-rows-[1fr] pt-6 opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-6 rounded-card border border-white/10 bg-surface p-5 sm:p-6">
              <ChipGroup title={t("explorer.styleTitle")} options={GENRE_FILTERS} selected={selectedGenres} label={styleLabel} onToggle={(v) => setSelectedGenres((s) => toggleInSet(s, v))} />
              <ChipGroup title={t("explorer.vibeTitle")} options={ATTRIBUTE_FILTERS} selected={selectedAttributes} label={attrLabel} onToggle={(v) => setSelectedAttributes((s) => toggleInSet(s, v))} />
              <ChipGroup title={t("explorer.ageTitle")} options={AGE_FILTERS} selected={selectedAges} onToggle={(v) => setSelectedAges((s) => toggleInSet(s, v))} />
              {availableZones.length > 1 && (
                <ChipGroup
                  title={t("explorer.zoneTitle")}
                  options={availableZones}
                  selected={selectedZones}
                  onToggle={(v) => {
                    setSelectedZones((s) => toggleInSet(s, v))
                    setSelectedNeighborhoods(new Set())
                  }}
                />
              )}
              <ChipGroup title={t("explorer.barrioTitle")} options={neighborhoods} selected={selectedNeighborhoods} onToggle={(v) => setSelectedNeighborhoods((s) => toggleInSet(s, v))} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-6">
          <p className="text-sm text-zinc-400" aria-live="polite">
            {(sortedClubs.length === 1 ? t("explorer.countOne") : t("explorer.countMany")).replace("{n}", String(sortedClubs.length))}
          </p>
        </section>

        <section className="mx-auto mt-4 grid max-w-7xl gap-5 px-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleClubs.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-lg font-semibold text-zinc-200">{t("explorer.emptyTitle")}</p>
              <p className="mt-2 text-sm text-zinc-400">{t("explorer.emptyBody")}</p>
              {activeFilters.length > 0 && (
                <button onClick={clearAll} className="mt-6 rounded-ctl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/10">
                  {t("explorer.clearFilters")}
                </button>
              )}
            </div>
          ) : (
            visibleClubs.map((club) => (
              <ClubCard
                key={club.id}
                id={club.id}
                name={club.name}
                slug={club.slug}
                music={club.music}
                area={club.neighborhood}
                price={club.price}
                hours={club.hours}
                openDays={club.open_days}
                image={club.image}
                rating={club.google_rating || club.rating}
                lgtbi_friendly={club.lgtbi_friendly}
                verified={club.verified}
                discountInfo={club.discount_info}
                freeEntryInfo={club.free_entry_info}
                liveStatus={club.live_status}
                liveStatusUpdatedAt={club.live_status_updated_at}
              />
            ))
          )}
        </section>

        {visibleCount < sortedClubs.length && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-ctl border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              {t("explorer.showMore").replace("{n}", String(Math.min(PAGE_SIZE, sortedClubs.length - visibleCount)))}
            </button>
          </div>
        )}
      </main>
    </>
  )
}