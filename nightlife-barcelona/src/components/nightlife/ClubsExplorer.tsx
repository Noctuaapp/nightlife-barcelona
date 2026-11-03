"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import ClubTile from "./ClubTile"
import ExploreSwitch from "./ExploreSwitch"
import { ClubsNudge, ClubsNudgeRow, NUDGE_ORDER } from "./ClubsNudge"
import { useLanguage } from "../../context/LanguageContext"
import { matchesQuery } from "../../lib/textSearch"
import { EXTRA_FEATURES } from "../../lib/extraFeatures"
import { SearchIcon, CloseIcon, LocationIcon, FlameIcon, SlidersIcon, ChevronDownIcon } from "../ui/FilterIcons"
import { areasForPostalCode } from "../../lib/postalCodes"
import { clubStaysOpenPast, madridClock } from "../../lib/clubHours"
import { effectiveOpenNow, isClosedTonight } from "../../lib/scheduleNotices"
import SectionHero from "../ui/SectionHero"
import { WEEK_DOW_ORDER, tonightDow, clubMatchesDay } from "../../lib/clubDays"
import { OFFERS_FILTER, hasOffer } from "../../lib/offers"
import { optionsWithData } from "../../lib/filterOptions"
import { loadFilterMemory, onlyKnown, saveFilterMemory } from "../../lib/filterMemory"
import { Tag } from "lucide-react"

// Rediseño del listado (03/11/2026). Antes: cabecera de 230 px con título gigante, una barra con seis
// botones y un desplegable, un fondo animado fijo y tarjetas de 300 px una debajo de otra en el móvil.
// Ahora: cabecera de una línea, buscador + «Filtros» en una fila, una fila de atajos que se desliza
// (Ahora, Cerca, Trending, Ofertas y estilos), tarjetas de foto de dos en dos (tres y cuatro en
// pantallas grandes), y cada 12 tarjetas y al final de la lista, accesos al plan, al mapa y a los
// esenciales para que la lista no sea un callejón sin salida. La lógica de filtros, la memoria de
// filtros y el orden no cambian.

// Botón-etiqueta de los atajos y del panel de filtros.
function Chip({
  active,
  onClick,
  children,
  tone = "brand",
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: "brand" | "open"
}) {
  const on = tone === "open" ? "border-open/40 bg-open/15 text-open" : "border-brand bg-brand text-white"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-[13px] font-semibold transition active:scale-95 sm:px-3.5 ${
        active ? on : "border-white/10 bg-surface text-zinc-200 hover:border-white/25 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}

// labels: texto a enseñar si es distinto del valor (el filtro de día guarda "5" y enseña "Viernes").
function ChipGroup({
  title,
  options,
  selected,
  onToggle,
  labels,
  hint,
}: {
  title: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  labels?: Record<string, string>
  hint?: string
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-zinc-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip key={opt} active={selected.has(opt)} onClick={() => onToggle(opt)}>
            {labels?.[opt] ?? opt}
          </Chip>
        ))}
      </div>
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const GENRE_FILTERS = ["Techno", "Commercial", "Cocktail Bar", "Karaoke"]
// «Bar/pub abierto tras las 2:30» (29/10/2026): los bares y pubs que cierran más tarde de las 2:30,
// para quien busca dónde seguir cuando ya cierra casi todo pero no quiere ir a una discoteca.
const LATE_BAR_FILTER = "Bar/pub abierto tras las 2:30"
const ATTRIBUTE_FILTERS = ["Trending", OFFERS_FILTER, LATE_BAR_FILTER, "LGTBI+", "Sin cola", "Futbolín/Billar", "Descuento hoy", "Entrada gratis", ...EXTRA_FEATURES.filter((f) => f.filter).map((f) => f.filter as string)]
// Antes solo había "+18", "+21", "+25": los clubs con edad mínima de 30 (campo age_min = 30, editable
// desde la ficha del club) no se podían filtrar por aquí, aunque el dato existiera. Se añade "+30".
const AGE_FILTERS = ["+18", "+21", "+25", "+30"]
// 12 = múltiplo de 2, 3 y 4 columnas: los avisos que salen cada 12 tarjetas nunca dejan huecos.
const PAGE_SIZE = 12

// Filtros que se recuerdan al abrir una ficha y volver (lib/filterMemory.ts). No se guarda «Cerca de mí»:
// la ubicación hay que volver a pedirla.
const FILTER_MEMORY_KEY = "noctua_clubs_filters_v1"
type ClubsFilterMemory = {
  genres: string[]
  attributes: string[]
  ages: string[]
  neighborhoods: string[]
  search: string
  openNow: boolean
  day: number | null
  sortBy: string
  visibleCount: number
  scrollY: number | null
}

export default function ClubsExplorer({ initialClubs }: { initialClubs: any[] }) {
  const [clubs] = useState<any[]>(initialClubs)
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set())
  const [selectedAges, setSelectedAges] = useState<Set<string>>(new Set())
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [openNow, setOpenNow] = useState(false)
  // «Elige un día» (30/10/2026): null = cualquier día; si no, el número de getDay() (0 = domingo).
  // `tonight` (la noche de hoy, para marcarla en el filtro) se calcula ya en el navegador, no al
  // renderizar: la página se guarda en caché y el servidor podría pintar un "hoy" de otro día.
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [tonight, setTonight] = useState<number | null>(null)
  const [nearMe, setNearMe] = useState(false)
  // Locales abiertos ahora para la portada: depende de la hora, así que se calcula tras montar (la página
  // se sirve ya hecha) y se refresca cada minuto.
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<"recommended" | "rating" | "name" | "distance">("recommended")
  const [filtersOpen, setFiltersOpen] = useState(false)
  // "Ver N clubs": cierra los filtros y baja a los resultados (25/10/2026: al elegir un filtro el
  // panel se quedaba abierto y había que bajar mucho para ver qué había salido).
  const resultsRef = useRef<HTMLElement>(null)
  const showResults = () => {
    setFiltersOpen(false)
    // Tras cerrar el panel (animación de 300 ms), para que la posición ya sea la buena.
    setTimeout(() => {
      const el = resultsRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - 140
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
    }, 320)
  }
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { t } = useLanguage()

  // Memoria de filtros al volver de una ficha (01/11/2026, lib/filterMemory.ts). `hydrated` pasa a true
  // cuando ya se han recuperado (para no guardar los filtros vacíos encima de los buenos).
  const [hydrated, setHydrated] = useState(false)
  const pendingVisibleRef = useRef<number | null>(null)
  const pendingScrollRef = useRef<number | null>(null)
  const memoryStorage = () => {
    try {
      return window.sessionStorage
    } catch {
      return null
    }
  }

  // Lo que se buscó desde la portada llega como /clubs?search=... — antes este listado no leía
  // ese parámetro, así que al pulsar Enter en la portada salían TODOS los clubs sin filtrar.
  // Una búsqueda nueva desde la portada manda sobre los filtros recordados.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("search")
    if (q) {
      setSearch(q)
    } else {
      const mem = loadFilterMemory<ClubsFilterMemory>(memoryStorage(), FILTER_MEMORY_KEY)
      if (mem) {
        const hoods = new Set<string>(initialClubs.map((c) => c.neighborhood).filter(Boolean))
        setSelectedGenres(new Set(onlyKnown(mem.genres, GENRE_FILTERS)))
        setSelectedAttributes(new Set(onlyKnown(mem.attributes, ATTRIBUTE_FILTERS)))
        setSelectedAges(new Set(onlyKnown(mem.ages, AGE_FILTERS)))
        setSelectedNeighborhoods(new Set(onlyKnown(mem.neighborhoods, hoods)))
        if (typeof mem.search === "string") setSearch(mem.search.slice(0, 100))
        if (mem.openNow === true) setOpenNow(true)
        if (typeof mem.day === "number" && mem.day >= 0 && mem.day <= 6) setSelectedDay(mem.day)
        if (mem.sortBy === "rating" || mem.sortBy === "name") setSortBy(mem.sortBy)
        if (typeof mem.visibleCount === "number" && Number.isFinite(mem.visibleCount)) {
          pendingVisibleRef.current = Math.min(Math.max(Math.floor(mem.visibleCount), PAGE_SIZE), 300)
        }
        if (typeof mem.scrollY === "number" && mem.scrollY > 0) pendingScrollRef.current = mem.scrollY
      }
    }
    // /clubs?open=1 es el «Ver todos» de la portada cuando hay locales abiertos: activa «Abierto ahora».
    // Antes este parámetro se ignoraba y el listado salía sin filtrar.
    if (new URLSearchParams(window.location.search).get("open") === "1") setOpenNow(true)
    const { dow, minutes } = madridClock()
    setTonight(tonightDow(dow, minutes))
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const count = () =>
      setOpenCount(
        clubs.filter((c) => c.temporarily_closed !== true && effectiveOpenNow({ hours: c.hours, open_days: c.open_days, schedule_notices: c.schedule_notices }) === true).length
      )
    count()
    const id = window.setInterval(count, 60000)
    return () => window.clearInterval(id)
  }, [clubs])

  // Al cambiar un filtro se vuelve a las primeras tarjetas; al recuperar los guardados, a las que
  // se estaban viendo.
  useEffect(() => {
    if (!hydrated) return
    const restored = pendingVisibleRef.current
    pendingVisibleRef.current = null
    setVisibleCount(restored ?? PAGE_SIZE)
  }, [hydrated, selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, search, openNow, selectedDay, nearMe, sortBy])

  const memorySnapshot = (scrollY: number | null): ClubsFilterMemory => ({
    genres: Array.from(selectedGenres),
    attributes: Array.from(selectedAttributes),
    ages: Array.from(selectedAges),
    neighborhoods: Array.from(selectedNeighborhoods),
    search,
    openNow,
    day: selectedDay,
    sortBy: sortBy === "distance" ? "recommended" : sortBy,
    visibleCount,
    scrollY,
  })

  useEffect(() => {
    if (!hydrated) return
    saveFilterMemory(memoryStorage(), FILTER_MEMORY_KEY, memorySnapshot(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, search, openNow, selectedDay, sortBy, visibleCount])

  // Volver a donde se estaba en la lista (una sola vez): tras recuperar los filtros y dar tiempo a que
  // se pinten las tarjetas.
  useEffect(() => {
    if (!hydrated || pendingScrollRef.current === null) return
    const id = window.setTimeout(() => {
      const y = pendingScrollRef.current
      pendingScrollRef.current = null
      if (y !== null) window.scrollTo({ top: y, left: 0, behavior: "instant" })
    }, 220)
    return () => window.clearTimeout(id)
  }, [hydrated])

  // Al abrir una ficha desde la lista se guarda también por dónde ibas.
  const rememberScroll = (e: React.MouseEvent<HTMLElement>) => {
    if (!(e.target as HTMLElement).closest("a")) return
    saveFilterMemory(memoryStorage(), FILTER_MEMORY_KEY, memorySnapshot(window.scrollY))
  }

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
    if (g === "Cocktail Bar") return club.music?.toLowerCase().includes("cocktail") || club.venue_type === "Coctelería"
    if (g === "Karaoke") return club.venue_type === "Karaoke" || /karaoke/i.test(`${club.name} ${club.music || ""}`)
    return false
  }

  const attributeMatch = (club: any, a: string) => {
    if (a === "Trending") return club.trending === true
    if (a === OFFERS_FILTER) return hasOffer(club)
    if (a === LATE_BAR_FILTER) return !!club.venue_type && club.venue_type !== "Discoteca" && clubStaysOpenPast(club.hours) === true
    if (a === "LGTBI+") return club.lgtbi_friendly === true
    if (a === "Sin cola") return club.queue === "No queue" || !club.queue
    if (a === "Futbolín/Billar") return club.has_foosball === true
    if (a === "Descuento hoy") return !!club.discount_info
    if (a === "Entrada gratis") return !!club.free_entry_info
    const extra = EXTRA_FEATURES.find((f) => f.filter === a)
    if (extra) return club[extra.field] === true
    return false
  }

  const ageMatch = (club: any, age: string) => {
    if (age === "+18") return club.age_min === 18
    if (age === "+21") return club.age_min === 21
    if (age === "+25") return club.age_min === 25
    if (age === "+30") return club.age_min === 30
    return false
  }

  // Solo se enseñan los filtros que algún local cumple (lib/filterOptions.ts): antes salían todos y, al
  // pulsar uno sin datos, aparecía «No hay clubs con estos filtros». Los ya elegidos se quedan.
  const available = useMemo(
    () => ({
      genres: new Set(optionsWithData(GENRE_FILTERS, clubs, genreMatch)),
      attributes: new Set(optionsWithData(ATTRIBUTE_FILTERS, clubs, attributeMatch)),
      ages: new Set(optionsWithData(AGE_FILTERS, clubs, ageMatch)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clubs]
  )
  const shownGenres = GENRE_FILTERS.filter((g) => available.genres.has(g) || selectedGenres.has(g))
  const shownAttributes = ATTRIBUTE_FILTERS.filter((a) => available.attributes.has(a) || selectedAttributes.has(a))
  const shownAges = AGE_FILTERS.filter((a) => available.ages.has(a) || selectedAges.has(a))
  const trendingShown = available.attributes.has("Trending") || selectedAttributes.has("Trending")
  const offersShown = available.attributes.has(OFFERS_FILTER) || selectedAttributes.has(OFFERS_FILTER)

  const neighborhoods = Array.from(new Set(clubs.map((c) => c.neighborhood).filter(Boolean))).sort()

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesGenre = selectedGenres.size === 0 || Array.from(selectedGenres).some((g) => genreMatch(club, g))
      const matchesAttributes = Array.from(selectedAttributes).every((a) => attributeMatch(club, a))
      const matchesAge = selectedAges.size === 0 || Array.from(selectedAges).some((age) => ageMatch(club, age))
      const matchesNeighborhood = selectedNeighborhoods.size === 0 || selectedNeighborhoods.has(club.neighborhood)

      // Si lo escrito es un código postal de Barcelona (o de L'Hospitalet, Badalona o El Prat),
      // se busca también por las zonas que le corresponden, además del texto tal cual — así
      // "08012" encuentra los clubs de Gràcia aunque nadie haya escrito "08012" en ningún sitio.
      const postalAreas = areasForPostalCode(search)
      const matchesSearch =
        search.trim() === "" ||
        matchesQuery(search, [club.name, club.neighborhood, club.music, club.address, club.city, club.venue_type]) ||
        (!!postalAreas && postalAreas.some((area) => matchesQuery(area, [club.neighborhood])))

      const matchesOpenNow = !openNow || (club.temporarily_closed !== true && !isClosedTonight(club.schedule_notices) && isOpenNow(club.hours))
      const matchesDay = clubMatchesDay(club.hours, club.open_days, selectedDay)

      const matchesNearMe =
        !nearMe ||
        !userLat ||
        !userLng ||
        (club.latitude && club.longitude && getDistance(userLat, userLng, club.latitude, club.longitude) <= 2)

      return matchesGenre && matchesAttributes && matchesAge && matchesNeighborhood && matchesSearch && matchesOpenNow && matchesDay && matchesNearMe
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, selectedGenres, selectedAttributes, selectedAges, selectedNeighborhoods, search, openNow, selectedDay, nearMe, userLat, userLng])

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
    // Los cerrados temporalmente siguen en el listado, pero al final (salvo orden A-Z).
    if (sortBy !== "name") return [...arr.filter((c) => c.temporarily_closed !== true), ...arr.filter((c) => c.temporarily_closed === true)]
    return arr
  }, [filteredClubs, sortBy, userLat, userLng])

  const visibleClubs = sortedClubs.slice(0, visibleCount)

  // Etiquetas que se quitan de un toque bajo el buscador. Ahora, Cerca, Trending, Ofertas y los estilos
  // ya tienen su propio botón (encendido) en la fila de atajos, y la búsqueda se ve en su campo: aquí
  // solo van los demás atributos, la edad, los barrios y el día.
  const QUICK_ATTRIBUTES = ["Trending", OFFERS_FILTER]
  const activeFilters: { label: string; onRemove: () => void }[] = [
    ...Array.from(selectedAttributes)
      .filter((a) => !QUICK_ATTRIBUTES.includes(a))
      .map((a) => ({ label: a, onRemove: () => setSelectedAttributes((s) => toggleInSet(s, a)) })),
    ...Array.from(selectedAges).map((age) => ({ label: age, onRemove: () => setSelectedAges((s) => toggleInSet(s, age)) })),
    ...Array.from(selectedNeighborhoods).map((n) => ({ label: n, onRemove: () => setSelectedNeighborhoods((s) => toggleInSet(s, n)) })),
  ]
  if (selectedDay !== null) activeFilters.push({ label: `${t("clubs.dayOpens")}: ${t(`clubs.day${selectedDay}`)}`, onRemove: () => setSelectedDay(null) })

  const clearAll = () => {
    setSelectedGenres(new Set())
    setSelectedAttributes(new Set())
    setSelectedAges(new Set())
    setSelectedNeighborhoods(new Set())
    setOpenNow(false)
    setSelectedDay(null)
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

  const activeFilterCount =
    selectedGenres.size + selectedAttributes.size + selectedAges.size + selectedNeighborhoods.size + (selectedDay !== null ? 1 : 0)

  const toggleNearMe = () => {
    if (nearMe) {
      setNearMe(false)
      setUserLat(null)
      setUserLng(null)
    } else requestNearMe()
  }
  const anyActive = activeFilterCount > 0 || openNow || nearMe || search.trim() !== ""
  const clubsWord = sortedClubs.length === 1 ? "club" : "clubs"

  return (
    <main className="relative min-h-[60vh] pb-12 text-ink">
      {/* PORTADA con la foto de la web (03/11/2026): selector Clubs · Eventos · Esenciales (30/10/2026),
          cuántos locales están abiertos ahora (dato real, se calcula en el navegador) y el título. */}
      <SectionHero
        section="clubs"
        title={t("clubs.subtitle")}
        pill={openCount === null || openCount === 0 ? t("home.liveTonight") : (openCount === 1 ? t("home.liveOpenOne") : t("home.liveOpenMany")).replace("{n}", String(openCount))}
        switcher={<ExploreSwitch active="clubs" />}
      />

      {/* BUSCADOR + ATAJOS. Solo se queda fijo al hacer scroll en pantallas grandes (lg+), donde cabe en
          una sola fila y se pega justo debajo de la cabecera (72 px en móvil, 80 px desde sm). En el
          móvil ocupa dos filas y, si fuera fijo, taparía un tercio de la pantalla (27/10/2026). */}
      <div className="relative z-30 border-y border-white/10 bg-night/90 py-3 backdrop-blur-xl lg:sticky lg:top-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2.5 px-4 lg:flex-nowrap lg:gap-3">
          <div className="group order-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-ctl border border-white/10 bg-surface px-3.5 py-2.5 transition focus-within:border-brand lg:max-w-sm">
            <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500 transition group-focus-within:text-brand-soft" />
            <input
              type="text"
              enterKeyHint="search"
              aria-label={t("clubs.search")}
              placeholder={t("clubs.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-zinc-500 sm:text-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-zinc-500 transition hover:text-ink" aria-label="Limpiar búsqueda">
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={`order-2 flex shrink-0 items-center gap-2 rounded-ctl border px-3.5 py-2.5 text-sm font-semibold transition active:scale-95 lg:order-3 ${
              filtersOpen || activeFilterCount > 0 ? "border-brand bg-brand/15 text-ink" : "border-white/10 bg-surface text-zinc-200 hover:border-white/25"
            }`}
          >
            <SlidersIcon className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{activeFilterCount}</span>
            )}
          </button>

          {/* Fila que se desliza. En el móvil los iconos se quitan para que Ahora, Cerca, Trending y Ofertas
              quepan enteros sin cortarse (03/11/2026); lo que sigue (los estilos) se desvanece por la
              derecha para que se note que hay más. */}
          <div
            role="group"
            aria-label="Filtros rápidos"
            className="scrollbar-none order-3 -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto pl-4 pr-6 [mask-image:linear-gradient(to_right,#000_calc(100%_-_24px),transparent)] lg:order-2 lg:mx-0 lg:w-auto lg:min-w-0 lg:flex-1 lg:pl-0"
          >
            <Chip active={openNow} tone="open" onClick={() => setOpenNow(!openNow)}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${openNow ? "live-dot bg-open" : "bg-zinc-500"}`} />
              Ahora
            </Chip>
            <Chip active={nearMe} onClick={toggleNearMe}>
              <LocationIcon className="hidden h-3.5 w-3.5 sm:block" />
              Cerca
            </Chip>
            {trendingShown && (
              <Chip active={selectedAttributes.has("Trending")} onClick={() => setSelectedAttributes((s) => toggleInSet(s, "Trending"))}>
                <FlameIcon className="hidden h-3.5 w-3.5 sm:block" />
                Trending
              </Chip>
            )}
            {/* «Ofertas» (01/11/2026): locales con promoción o entrada gratis; solo sale si hay alguno. */}
            {offersShown && (
              <Chip active={selectedAttributes.has(OFFERS_FILTER)} onClick={() => setSelectedAttributes((s) => toggleInSet(s, OFFERS_FILTER))}>
                <Tag size={14} aria-hidden="true" className="hidden sm:block" />
                Ofertas
              </Chip>
            )}
            {shownGenres.length > 0 && <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 self-center bg-white/10" />}
            {shownGenres.map((g) => (
              <Chip key={g} active={selectedGenres.has(g)} onClick={() => setSelectedGenres((s) => toggleInSet(s, g))}>
                {g}
              </Chip>
            ))}
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mx-auto mt-2.5 flex max-w-7xl flex-wrap items-center gap-2 px-4">
            {activeFilters.map((f, i) => (
              <button
                key={`${f.label}-${i}`}
                type="button"
                onClick={f.onRemove}
                className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand-soft transition hover:bg-brand/25"
              >
                {f.label} <CloseIcon className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PANEL DE FILTROS — todos multi-selección y combinables entre sí. Se queda siempre montado y
          anima su propia altura (grid-template-rows 0fr→1fr) en vez de aparecer de golpe; cerrado, no
          se puede tabular a sus botones (inert). */}
      <section
        className={`mx-auto grid max-w-7xl px-4 transition-[grid-template-rows,opacity] duration-300 ease-out ${
          filtersOpen ? "grid-rows-[1fr] pt-4 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden" inert={!filtersOpen}>
          <div className="space-y-5 rounded-card border border-white/10 bg-surface/60 p-4 md:p-5">
            {/* «Elige un día»: un solo día a la vez; pulsar el elegido lo quita. */}
            <ChipGroup
              title={t("clubs.dayTitle")}
              options={WEEK_DOW_ORDER.map(String)}
              labels={Object.fromEntries(WEEK_DOW_ORDER.map((d) => [String(d), t(`clubs.day${d}`) + (tonight === d ? ` (${t("clubs.dayToday")})` : "")]))}
              selected={new Set(selectedDay === null ? [] : [String(selectedDay)])}
              onToggle={(v) => setSelectedDay((cur) => (cur === Number(v) ? null : Number(v)))}
              hint={t("clubs.dayHint")}
            />
            {shownGenres.length > 0 && (
              <ChipGroup title="Estilo (elige varios)" options={shownGenres} selected={selectedGenres} onToggle={(v) => setSelectedGenres((s) => toggleInSet(s, v))} />
            )}
            {shownAttributes.length > 0 && (
              <ChipGroup title="Ambiente" options={shownAttributes} selected={selectedAttributes} onToggle={(v) => setSelectedAttributes((s) => toggleInSet(s, v))} />
            )}
            {shownAges.length > 0 && (
              <ChipGroup title="Edad mínima" options={shownAges} selected={selectedAges} onToggle={(v) => setSelectedAges((s) => toggleInSet(s, v))} />
            )}
            {neighborhoods.length > 0 && (
              <ChipGroup title="Barrio (elige varios)" options={neighborhoods} selected={selectedNeighborhoods} onToggle={(v) => setSelectedNeighborhoods((s) => toggleInSet(s, v))} />
            )}

            {/* Cierre del panel (01/11/2026): tras elegir, un botón al final para cerrarlo y ver los resultados. */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {anyActive ? (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-zinc-400 underline-offset-2 transition hover:text-ink hover:underline">
                  Limpiar filtros
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={showResults} className="rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95">
                Cerrar y ver {sortedClubs.length} {clubsWord}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Botón flotante mientras los filtros están abiertos: se ve siempre, sin tener que bajar. */}
      {filtersOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-8">
          <button
            type="button"
            onClick={showResults}
            className="pointer-events-auto rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/50 transition hover:bg-brand-strong active:scale-95"
          >
            Ver {sortedClubs.length} {clubsWord}
          </button>
        </div>
      )}

      {/* Cuántos hay + orden */}
      <section ref={resultsRef} className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-5">
        <div className="flex min-w-0 items-center gap-3 text-sm text-zinc-400">
          <p>
            <span className="font-semibold text-ink">{sortedClubs.length}</span> {clubsWord}
          </p>
          {anyActive && (
            <button type="button" onClick={clearAll} className="font-semibold text-brand-soft underline-offset-2 hover:underline">
              Limpiar
            </button>
          )}
        </div>
        <div className="relative shrink-0">
          <select
            aria-label="Ordenar"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none rounded-full border border-white/10 bg-surface py-2 pl-3.5 pr-8 text-[13px] font-medium text-zinc-200 outline-none focus-visible:border-brand"
          >
            <option value="recommended" className="bg-night">Recomendado</option>
            <option value="rating" className="bg-night">Mejor valorados</option>
            <option value="name" className="bg-night">A-Z</option>
            {nearMe && <option value="distance" className="bg-night">Más cercanos</option>}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        </div>
      </section>

      {/* Resultados */}
      <section onClickCapture={rememberScroll} className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-3 px-4 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {visibleClubs.length === 0 ? (
          <div className="col-span-full rounded-card border border-white/10 bg-surface px-6 py-12 text-center">
            <p className="text-base font-semibold text-ink">No hay clubs con estos filtros</p>
            <p className="mt-1.5 text-sm text-zinc-400">Prueba a quitar algún filtro o busca otro barrio.</p>
            {anyActive && (
              <button type="button" onClick={clearAll} className="mt-5 rounded-ctl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          visibleClubs.flatMap((club, index) => {
            const tile = (
              <ClubTile
                key={club.id}
                name={club.name}
                slug={club.slug}
                music={club.music}
                area={club.neighborhood}
                price={club.price}
                hours={club.hours}
                openDays={club.open_days}
                image={club.image}
                rating={club.rating}
                lgtbi_friendly={club.lgtbi_friendly}
                verified={club.verified}
                discountInfo={club.discount_info}
                freeEntryInfo={club.free_entry_info}
                liveStatus={club.live_status}
                liveStatusUpdatedAt={club.live_status_updated_at}
                temporarilyClosed={club.temporarily_closed === true}
                scheduleNotices={club.schedule_notices}
                priority={index < 4}
              />
            )
            // Un aviso de «sigue explorando» entre cada 12 tarjetas (nunca al final: ahí va la fila de tres).
            if ((index + 1) % PAGE_SIZE === 0 && index + 1 < visibleClubs.length) {
              const kind = NUDGE_ORDER[((index + 1) / PAGE_SIZE - 1) % NUDGE_ORDER.length]
              return [
                tile,
                <div key={`nudge-${index}`} className="col-span-full">
                  <ClubsNudge kind={kind} />
                </div>,
              ]
            }
            return [tile]
          })
        )}
      </section>

      {visibleCount < sortedClubs.length && (
        <div className="mx-auto mt-6 flex max-w-7xl justify-center px-4">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full rounded-ctl border border-white/15 bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition hover:border-white/30 sm:w-auto sm:min-w-[280px]"
          >
            Mostrar más ({sortedClubs.length - visibleCount} más)
          </button>
        </div>
      )}

      <ClubsNudgeRow />
    </main>
  )
}
