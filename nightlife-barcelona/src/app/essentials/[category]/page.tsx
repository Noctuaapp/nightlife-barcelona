"use client"

import { zoneOf, zonesPresent } from "../../../lib/zones"
import { getMetroTonight } from "../../../lib/transitHours"
import { cleanEssential } from "../../../lib/essentials"
import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"
import { track } from "../../../lib/track"
import { fetchAllPages } from "../../../lib/fetchAll"
import { useLanguage } from "../../../context/LanguageContext"
import ArrowIcon from "../../../components/ui/ArrowIcon"
import { distanceInMeters, formatDistance, walkingMinutes } from "../../../lib/geo"
import { getOpenStatus } from "../../../lib/openStatus"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import EssentialPhoto from "../../../components/essentials/EssentialPhoto"
import Icon from "../../../components/ui/Icon"
import { ESSENTIAL_CATEGORIES, categoryNameKey } from "../../../lib/essentialCategories"
import { NIGHT_BUS_LINES } from "../../../lib/nightBuses"
import { METRO_STATIONS } from "../../../lib/metroStations"
import { MetroLineBadge, NitbusBadge, NitbusRouteRow } from "../../../components/ui/TransitBadge"
import { NITBUS_PLATE } from "../../../lib/transitColors"
import { ChevronDown, MapPin } from "lucide-react"
import NitbusStopsMap, { type NitbusMapStop } from "../../../components/nitbus/NitbusStopsMap"
import { getPrecisePosition } from "../../../lib/precisePosition"

// Un solo color (el de la marca) para todas las categorías; antes eran doce colores y emojis.
const BRAND = "#7c5cff"

const METRO_LINE_ORDER = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"]

// En Taxi, además de paradas reales, se cuelan oficinas/apps (Uber, Cabify, Bolt...) que no son
// un sitio al que ir a buscar un coche: no tiene sentido enseñarlas en la lista ni como chincheta
// en el mapa (ya están cubiertas por los botones "pedir ya" de arriba). Mismo filtro que en la
// ficha de club (ClubTransport.tsx).
const NOT_A_RANK = /cabify|uber|bolt|free\s?now|oficina|office|headquarter/i

const TAXI_APPS = [
  { name: "FREE NOW", url: "https://www.free-now.com/es/" },
  { name: "Cabify", url: "https://cabify.com/es" },
  { name: "Uber", url: "https://www.uber.com/es/es/" },
]

const TAXI_PHONES = [
  { name: "Radio Taxi 033", phone: "933033033" },
  { name: "Fonotaxi", phone: "933001100" },
]

type Essential = {
  id: number
  name: string
  category: string
  address: string | null
  neighborhood: string | null
  description: string | null
  image: string | null
  open_hours: string | null
  maps_link: string | null
  latitude: number | null
  longitude: number | null
  highFee?: boolean
  // Subdivisión libre dentro de la categoría: el banco en un cajero (CaixaBank, Santander...) o
  // el tipo de comida en un local de Food (Pizza, Kebab, Hamburguesas...). Opcional: si un local
  // no la tiene puesta, simplemente no entra en ningún chip de subcategoría.
  subcategory: string | null
}


// Desplegable de filtro con aspecto de píldora. La primera opción ("Toda el área", "Todos los
// barrios"...) es «sin filtro»: mientras está elegida el desplegable se ve neutro, y con otra opción
// se marca en el color de la marca para que se note que hay un filtro puesto.
function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const active = value !== options[0]?.value
  return (
    <div className="relative min-w-[10.5rem] flex-1 sm:max-w-xs sm:flex-none">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={options[0]?.label}
        style={{ colorScheme: "dark" }}
        className={`h-11 w-full appearance-none truncate rounded-full border py-2.5 pl-3.5 pr-8 text-sm font-semibold outline-none transition ${
          active ? "border-brand/60 bg-brand/15 text-ink" : "border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.07]"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-night text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${active ? "text-brand-soft" : "text-zinc-400"}`} />
    </div>
  )
}

export default function EssentialCategoryPage() {
  const { t } = useLanguage()
  // Horario del metro de esta noche (con vísperas de festivo). Se calcula tras montar: depende de la hora.
  const [metroLabel, setMetroLabel] = useState("")
  useEffect(() => {
    const m = getMetroTonight()
    setMetroLabel(
      m.state === "closed"
        ? t("clubPage.metroClosed")
        : m.closes === "all-night"
        ? t("clubPage.metroAllNight")
        : t("clubPage.metroUntil").replace("{time}", m.closes)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const params = useParams()
  const category = (params.category as string).toLowerCase()
  const info = ESSENTIAL_CATEGORIES.find((c) => c.slug === category)
  const CatIcon = info?.icon || MapPin
  const config = { color: BRAND }
  const label = info ? t(categoryNameKey(info.key)) : category

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [essentials, setEssentials] = useState<Essential[]>([])
  const [selected, setSelected] = useState<Essential | null>(null)

  // Analítica de esenciales (30/10/2026): antes solo quedaba "entró a /essentials" (page_nav). Ahora:
  //   essential_category   → abre una categoría (farmacias, súper...)
  //   essential_open       → abre un local (tarjeta o chincheta del mapa)
  //   essential_directions → pulsa «Cómo llegar»
  //   essential_maps       → pulsa «Google Maps»
  // Se ve en Admin › Datos › Esenciales. Los locales del catálogo fijo (metro; id ≤ 0) no tienen fila
  // propia: se anotan sin id.
  useEffect(() => {
    track("essential_category", { itemType: "essential_category", itemName: category })
  }, [category])
  useEffect(() => {
    if (!selected || selected.id <= 0) return
    track("essential_open", { itemType: "essential", itemId: selected.id, itemName: selected.name, meta: { category } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])
  const trackEssentialClick = (eventType: "essential_directions" | "essential_maps", item: Essential) =>
    track(eventType, { itemType: "essential", itemId: item.id > 0 ? item.id : null, itemName: item.name, meta: { category } })
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All")
  const [selectedZone, setSelectedZone] = useState("All")
  const [selectedSubcategory, setSelectedSubcategory] = useState("All")
  // Solo para Metro: 155 estaciones en una lista plana no se puede buscar ni entender, así que se
  // puede filtrar por línea (como en el plano real) o buscar por nombre.
  const [selectedMetroLine, setSelectedMetroLine] = useState("All")
  const [metroSearch, setMetroSearch] = useState("")
  // Metro y Nitbus se filtran igual: por línea y buscando la estación/parada por nombre.
  const isLineCategory = category === "metro" || category === "nitbus"
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sortByDistance, setSortByDistance] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "map">("list")
  const [openOnly, setOpenOnly] = useState(false)
  const [mapHint, setMapHint] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [farAway, setFarAway] = useState(false)
  // Margen de error de la ubicación (m), y un contador que sube cuando hay que encuadrar el mapa
  // de Nitbus al usuario (primera lectura y, si se movió bastante al afinar, la final).
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null)
  const [userFixNonce, setUserFixNonce] = useState(0)
  const [locationFail, setLocationFail] = useState(false)
  // Lista de paradas de Nitbus por tandas: son más de 2.000.
  const NB_PAGE = 24
  const [nbLimit, setNbLimit] = useState(NB_PAGE)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement>(null)
  const pendingFitRef = useRef<[number, number][] | null>(null)
  // Leído dentro de los listeners táctiles del mapa, que se montan una sola vez: necesitan ver
  // el valor de mobileView al vuelo, no el que había cuando se añadió el listener.
  const mobileViewRef = useRef(mobileView)
  useEffect(() => {
    mobileViewRef.current = mobileView
  }, [mobileView])
  const didInitialFit = useRef(false)

  // Enlaces que llegan a esta página apuntando a algo concreto (25/10/2026). Antes, al tocar una
  // parada en "Cerca de ti" o "Ver paradas" en la ficha de un club, se llegaba a la lista general
  // sin nada seleccionado. Ahora:
  //   ?id=123              → abre ese sitio en el mapa
  //   ?line=N24            → filtra por esa línea (Nitbus o metro)
  //   ?line=N24&lat=..&lon=.. → además, abre la parada de esa línea más cercana a ese punto
  const focusRef = useRef<{ id: string | null; line: string | null; lat: number | null; lon: number | null } | null>(null)
  const focusDone = useRef(false)
  const linesSectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const lat = Number(p.get("lat"))
    const lon = Number(p.get("lon"))
    const line = (p.get("line") || "").trim().toUpperCase() || null
    focusRef.current = {
      id: p.get("id"),
      line,
      lat: p.get("lat") && isFinite(lat) ? lat : null,
      lon: p.get("lon") && isFinite(lon) ? lon : null,
    }
    if (line && (category === "metro" || category === "nitbus")) setSelectedMetroLine(line)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Encuadra el mapa a un conjunto de puntos. Si el mapa está oculto (móvil, vista lista) no
  // tiene tamaño y Mapbox calcularía mal el encuadre: se guarda y se aplica al mostrar el mapa.
  const fitMapTo = (points: [number, number][]) => {
    const m = map.current
    const el = mapContainer.current
    if (!m || points.length === 0) return
    if (!el || el.offsetWidth === 0) {
      pendingFitRef.current = points
      return
    }
    if (points.length === 1) {
      m.flyTo({ center: points[0], zoom: 15, duration: 800 })
      return
    }
    const bounds = new mapboxgl.LngLatBounds(points[0], points[0])
    points.forEach((pt) => bounds.extend(pt))
    m.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 })
  }

  // La ubicación solo se pide cuando el usuario pulsa "Cerca de mí" (antes se pedía al cargar,
  // sin que nadie lo hubiera pedido, y movía el mapa de golpe).
  // Se escucha el GPS unos segundos y se queda la lectura más precisa (ver lib/precisePosition): la
  // primera suele ser la peor (wifi/IP) y salía el metro más cercano en el sitio equivocado. Se
  // enseña algo con la primera lectura y se afina después.
  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true)
      return
    }
    setLocating(true)
    setLocationDenied(false)
    setLocationFail(false)
    let first: { lat: number; lng: number } | null = null
    getPrecisePosition({
      onUpdate: (p) => {
        setUserAccuracy(p.accuracy)
        setUserLocation((cur) => (cur && distanceInMeters(cur.lat, cur.lng, p.lat, p.lng) < 25 ? cur : { lat: p.lat, lng: p.lng }))
        if (!first) {
          first = { lat: p.lat, lng: p.lng }
          setSortByDistance(true)
          setUserFixNonce((n) => n + 1)
        }
      },
    })
      .then((p) => {
        // Si al afinar la posición se movió bastante, se vuelve a encuadrar.
        if (first && distanceInMeters(first.lat, first.lng, p.lat, p.lng) > 60) setUserFixNonce((n) => n + 1)
        setLocating(false)
      })
      .catch((e: { code?: number }) => {
        if (!first) {
          if (e.code === 1 || e.code === 0) setLocationDenied(true)
          else setLocationFail(true)
        }
        setLocating(false)
      })
  }

  useEffect(() => {
    const fetchEssentials = async () => {
      // Nitbus: desde el 25/10/2026 tiene paradas de verdad (importadas de OpenStreetMap desde
      // Ajustes y herramientas, con sus líneas), así que se piden como cualquier otra categoría.
      // Si aún no se han cargado, la página sigue enseñando solo la lista de líneas.
      // .eq("hidden", false) igual que en el listado — si no, un esencial oculto desde el admin
      // seguía siendo visitable por enlace directo.
      // El slug de la URL no es el valor real de la columna `category` cuando lleva más de una
      // palabra ("gas-station" en la URL, pero "Gas Station" en la base) — usar el slug tal cual
      // en el ilike no encontraba ninguna fila. Hay que usar la "key" real de la categoría.
      // Por páginas: Nitbus tiene más de 1.000 paradas y Supabase corta en 1.000 filas.
      const data = await fetchAllPages((from, to) =>
        supabase.from("essentials").select("*").ilike("category", info?.key || category).eq("hidden", false).order("name").order("id").range(from, to)
      )
      let rows: Essential[] = data ? data.map(cleanEssential) : []

      // Metro: con 155 estaciones sería inviable pedirte que las cargues una a una en el admin, así
      // que la red completa (metroStations.ts, con línea por estación) se añade sola. Si ya tienes
      // alguna cargada a mano (con foto, por ejemplo), esa gana: se evita duplicar por proximidad
      // (<120m), no por nombre exacto, porque los nombres no siempre coinciden letra a letra.
      if (category === "metro") {
        // Si una estación se cargó a mano (con foto, por ejemplo) sin rellenar sus líneas, antes
        // se quedaba sin L1/L2/L3... para siempre — el catálogo la descartaba por estar a <120m de
        // esa fila real, pero la fila real no traía las líneas consigo. Así que desaparecía al
        // filtrar por línea (p. ej. Drassanes). Ahora, si la fila real no tiene líneas propias, se
        // le copian las de la estación del catálogo más cercana antes de descartar esa del catálogo.
        const catalogLinesNear = (lat: number, lon: number): string | null => {
          const hit = METRO_STATIONS.find((s) => s.lines && s.lines.length > 0 && distanceInMeters(lat, lon, s.lat, s.lon) < 120)
          return hit ? hit.lines!.join(", ") : null
        }
        rows = rows.map((r) =>
          r.subcategory || !r.latitude || !r.longitude
            ? r
            : { ...r, subcategory: catalogLinesNear(Number(r.latitude), Number(r.longitude)) }
        )
        const yaCubierta = (lat: number, lon: number) =>
          rows.some((r) => r.latitude && r.longitude && distanceInMeters(lat, lon, Number(r.latitude), Number(r.longitude)) < 120)
        const catalogo: Essential[] = METRO_STATIONS.filter((s) => !yaCubierta(s.lat, s.lon)).map((s, i) => ({
          id: -1000 - i,
          name: s.name,
          category: "Metro",
          address: null,
          neighborhood: null,
          description: null,
          image: null,
          open_hours: null,
          maps_link: null,
          latitude: s.lat,
          longitude: s.lon,
          subcategory: s.lines && s.lines.length > 0 ? s.lines.join(", ") : null,
        }))
        rows = [...rows, ...catalogo].sort((a, b) => a.name.localeCompare(b.name))
      }

      setEssentials(rows)
      setLoading(false)
    }
    fetchEssentials()
  }, [category, info?.key])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.1734, 41.3851],
      zoom: 13,
    })

    // Sin rotación/inclinación: en el móvil se activaban sin querer al arrastrar con dos dedos.
    map.current.dragRotate.disable()
    map.current.touchZoomRotate.disableRotation()

    // En el móvil, la lista y el mapa son dos pestañas exclusivas (nunca se ven juntos): cuando
    // la pestaña activa es "Mapa", el mapa ocupa toda la vista y no compite con ningún scroll de
    // página, así que un dedo lo mueve con normalidad, como cualquier mapa. El gesto de dos dedos
    // solo hace falta en pantallas táctiles anchas (tablet en horizontal) donde lista y mapa se
    // ven a la vez lado a lado y un dedo necesita poder seguir desplazando la página.
    const mapEl = mapContainer.current
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    const exclusiveMobileMap = () => mobileViewRef.current === "map" && window.innerWidth < 768
    let hintTimer: ReturnType<typeof setTimeout> | undefined
    const onTouchStart = (e: TouchEvent) => {
      if (exclusiveMobileMap() || e.touches.length >= 2) {
        map.current?.dragPan.enable()
        if (e.cancelable && e.touches.length >= 2) e.preventDefault()
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (exclusiveMobileMap() || e.touches.length >= 2) {
        if (e.cancelable && e.touches.length >= 2) e.preventDefault()
        return
      }
      setMapHint(true)
      if (hintTimer) clearTimeout(hintTimer)
      hintTimer = setTimeout(() => setMapHint(false), 1200)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0 && !exclusiveMobileMap()) map.current?.dragPan.disable()
    }
    if (isTouch) {
      if (exclusiveMobileMap()) map.current.dragPan.enable()
      else map.current.dragPan.disable()
      mapEl.addEventListener("touchstart", onTouchStart, { capture: true, passive: false })
      mapEl.addEventListener("touchmove", onTouchMove, { capture: true, passive: false })
      mapEl.addEventListener("touchend", onTouchEnd, { capture: true, passive: true })
      mapEl.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true })
    }

    map.current.on("load", () => {
      setMapReady(true)
    })

    return () => {
      if (isTouch) {
        mapEl.removeEventListener("touchstart", onTouchStart, { capture: true })
        mapEl.removeEventListener("touchmove", onTouchMove, { capture: true })
        mapEl.removeEventListener("touchend", onTouchEnd, { capture: true })
        mapEl.removeEventListener("touchcancel", onTouchEnd, { capture: true })
      }
      if (hintTimer) clearTimeout(hintTimer)
      map.current?.remove()
      map.current = null
    }
  }, [])

  // El mapa está oculto (display:none) en móvil cuando la vista es "list", así que
  // hace falta forzar un resize cuando se vuelve a mostrar o Mapbox lo pinta mal.
  useEffect(() => {
    // Pestaña exclusiva "Mapa" en móvil: el mapa es todo lo que hay en pantalla, así que un
    // dedo lo mueve con normalidad (ver el efecto de arriba que crea el mapa).
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    if (isTouch) {
      if (mobileView === "map" && window.innerWidth < 768) map.current?.dragPan.enable()
      else map.current?.dragPan.disable()
    }
    if (mobileView === "map") {
      setTimeout(() => {
        // En el móvil, al pasar a "Mapa" se sube la página hasta el mapa (antes quedaba debajo
        // del encabezado y los filtros y había que buscarlo deslizando).
        if (window.innerWidth < 768) mapWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        map.current?.resize()
        if (pendingFitRef.current) {
          const pts = pendingFitRef.current
          pendingFitRef.current = null
          fitMapTo(pts)
        }
      }, 80)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileView])

  // Primer encuadre: que se vean todos los marcadores de la categoría.
  useEffect(() => {
    if (!mapReady || essentials.length === 0 || didInitialFit.current) return
    const pts = essentials
      .filter((e) => e.latitude && e.longitude)
      .map((e) => [Number(e.longitude), Number(e.latitude)] as [number, number])
    if (pts.length === 0) return
    didInitialFit.current = true
    fitMapTo(pts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, essentials])

  // Abrir lo que pedía el enlace (ver focusRef arriba), una sola vez, cuando ya hay datos y mapa.
  useEffect(() => {
    const f = focusRef.current
    if (!mapReady || essentials.length === 0 || !f || focusDone.current) return
    focusDone.current = true
    let target: Essential | undefined
    if (f.id) target = essentials.find((e) => String(e.id) === f.id)
    if (!target && f.line && f.lat !== null && f.lon !== null) {
      target = essentials
        .filter((e) => e.latitude && e.longitude && (e.subcategory || "").split(",").some((l) => l.trim().toUpperCase() === f.line))
        .map((e) => ({ e, d: distanceInMeters(f.lat!, f.lon!, Number(e.latitude), Number(e.longitude)) }))
        .sort((a, b) => a.d - b.d)[0]?.e
    }
    if (!target || !target.latitude || !target.longitude) return
    didInitialFit.current = true
    setSelected(target)
    setMobileView("map")
    fitMapTo([[Number(target.longitude), Number(target.latitude)]])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, essentials])

  // Nitbus: lo mismo que el efecto de arriba (abrir lo que pedía el enlace), pero sin el mapa de
  // esta página: el mapa de Nitbus es NitbusStopsMap, que se acerca solo a la parada elegida.
  useEffect(() => {
    const f = focusRef.current
    if (category !== "nitbus" || essentials.length === 0 || !f || focusDone.current) return
    focusDone.current = true
    let target: Essential | undefined
    if (f.id) target = essentials.find((e) => String(e.id) === f.id)
    if (!target && f.line && f.lat !== null && f.lon !== null) {
      target = essentials
        .filter((e) => e.latitude && e.longitude && (e.subcategory || "").split(",").some((l) => l.trim().toUpperCase() === f.line))
        .map((e) => ({ e, d: distanceInMeters(f.lat!, f.lon!, Number(e.latitude), Number(e.longitude)) }))
        .sort((a, b) => a.d - b.d)[0]?.e
    }
    if (target) setSelected(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, essentials])

  // La lista de paradas de Nitbus vuelve a la primera tanda al cambiar de línea, búsqueda u orden.
  useEffect(() => {
    setNbLimit(NB_PAGE)
  }, [selectedMetroLine, metroSearch, sortByDistance])

  // Al localizar al usuario: marcador morado y encuadre con los 5 más cercanos.
  useEffect(() => {
    if (!mapReady || !map.current || !userLocation) return
    userMarkerRef.current?.remove()
    userMarkerRef.current = new mapboxgl.Marker({ color: "#7c5cff" }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map.current)

    const nearest = essentials
      .filter((e) => e.latitude && e.longitude)
      .map((e) => ({ e, d: distanceInMeters(userLocation.lat, userLocation.lng, Number(e.latitude), Number(e.longitude)) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)

    // Si el más cercano está a >20 km (p. ej. fuera de Barcelona) no tiene sentido acercar el
    // mapa al usuario: se deja la vista de la categoría y se avisa en pantalla.
    const far = nearest.length > 0 && nearest[0].d > 20000
    setFarAway(far)
    const pts = nearest.map((n) => [Number(n.e.longitude), Number(n.e.latitude)] as [number, number])
    if (!far) pts.unshift([userLocation.lng, userLocation.lat])
    fitMapTo(pts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, userLocation])

  // Al elegir una línea de metro: encuadrar el mapa a solo esas estaciones, para que la línea se
  // vea entera de un vistazo en vez de perderse entre las otras 140 chinchetas.
  useEffect(() => {
    if (!mapReady || (category !== "metro" && category !== "nitbus") || selectedMetroLine === "All") return
    const pts = essentials
      .filter((e) => e.latitude && e.longitude && (e.subcategory || "").split(",").some((l) => l.trim().toUpperCase() === selectedMetroLine.toUpperCase()))
      .map((e) => [Number(e.longitude), Number(e.latitude)] as [number, number])
    if (pts.length > 0) fitMapTo(pts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, selectedMetroLine, category])

  useEffect(() => {
    if (!mapReady || !map.current || essentials.length === 0) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    essentials
      .filter((e) => e.latitude && e.longitude)
      .filter((e) => category !== "taxi" || !NOT_A_RANK.test(e.name || ""))
      .filter((e) => !isLineCategory || selectedMetroLine === "All" || (e.subcategory || "").split(",").some((l) => l.trim().toUpperCase() === selectedMetroLine.toUpperCase()))
      .filter((e) => !isLineCategory || !metroSearch.trim() || e.name.toLowerCase().includes(metroSearch.trim().toLowerCase()))
      .forEach((item) => {
        // Marcador redondo con la foto del sitio (como en el mapa de clubs); si no hay foto o falla,
        // el icono de la categoría. No se le pone transform propio: Mapbox lo usa para posicionarlo.
        const el = document.createElement("div")
        el.style.cssText = `width:40px;height:40px;border-radius:9999px;border:2px solid ${config.color};background:#16141f;color:#f4f3f7;overflow:hidden;display:flex;align-items:center;justify-content:center;font:600 15px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.55)`
        const initial = (item.name || "?").trim().charAt(0).toUpperCase()
        if (item.image) {
          const img = document.createElement("img")
          img.src = item.image
          img.referrerPolicy = "no-referrer"
          img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block"
          img.onerror = () => {
            img.remove()
            el.textContent = initial
          }
          el.appendChild(img)
        } else if (category === "nitbus" && item.subcategory) {
          // Parada de Nitbus: la primera línea en vez de la inicial del nombre.
          el.textContent = item.subcategory.split(",")[0].trim()
          el.style.fontSize = "12px"
          el.style.fontWeight = "800"
        } else {
          el.textContent = initial
        }
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([Number(item.longitude), Number(item.latitude)]).addTo(map.current!)

        marker.getElement().addEventListener("click", () => {
          setSelected(item)
          map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 16, duration: 800 })
        })

        markersRef.current.push(marker)
      })
  }, [mapReady, essentials, config.color, category, selectedMetroLine, metroSearch])

  const distMeters = (item: Essential): number | null =>
    userLocation && item.latitude && item.longitude
      ? distanceInMeters(userLocation.lat, userLocation.lng, Number(item.latitude), Number(item.longitude))
      : null

  const directionsFor = (item: Essential): string =>
    userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${item.latitude},${item.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`

  const distanceText = (d: number): string =>
    formatDistance(d) + (d <= 2500 ? " · " + t("essentialsPage.walkMin").replace("{n}", String(walkingMinutes(d))) : "")

  const availableZones = zonesPresent(essentials)
  // Líneas N que tienen alguna parada cargada, en orden (N0, N1, ... N28).
  const nitbusCodesPresent =
    category === "nitbus"
      ? Array.from(
          new Set(essentials.flatMap((e) => (e.subcategory || "").split(",").map((c) => c.trim().toUpperCase()).filter((c) => /^N\d+$/.test(c))))
        ).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
      : []
  const neighborhoods = [
    "All",
    ...Array.from(
      new Set(essentials.filter((e) => selectedZone === "All" || zoneOf(e) === selectedZone).map((e) => e.neighborhood).filter(Boolean))
    ),
  ]
  // Solo se enseña si hay al menos dos sitios con la subcategoría puesta: si nadie la ha
  // rellenado todavía, no tiene sentido un filtro con una sola opción.
  // Se agrupa ignorando mayúsculas/espacios ("Kebab" y "kebab " cuentan como lo mismo, porque es
  // texto libre escrito a mano en el admin y antes salían como dos chips distintos), pero se
  // enseña la primera forma tal cual se escribió, no una versión forzada a minúsculas.
  const subcategoryKey = (s: string) => s.trim().toLowerCase()
  // En Metro/Nitbus la "subcategoría" es la línea, y se enseña como dato en cada tarjeta (ver
  // renderCard), no como filtro: con una línea distinta casi por estación/parada, el filtro
  // saldría con decenas de chips inútiles. Solo tiene sentido como filtro en ATM/Food.
  const availableSubcategories =
    category === "metro" || category === "nitbus"
      ? []
      : Array.from(
          essentials.reduce((map, e) => {
            const raw = (e.subcategory || "").trim()
            if (raw && !map.has(subcategoryKey(raw))) map.set(subcategoryKey(raw), raw)
            return map
          }, new Map<string, string>())
        ).map(([, label]) => label)

  // Una estación de metro "tiene" una línea si esa línea aparece en su subcategoría (p.ej.
  // "L3, L5"), comparando sin mayúsculas/espacios para no fallar por cómo se escribió.
  const metroHasLine = (e: Essential, code: string) =>
    (e.subcategory || "").split(",").some((l) => l.trim().toUpperCase() === code.toUpperCase())

  const filteredEssentials = essentials
    .filter((e) => (category !== "taxi" ? true : !NOT_A_RANK.test(e.name || "")))
    .filter((e) => (!isLineCategory || selectedMetroLine === "All" ? true : metroHasLine(e, selectedMetroLine)))
    .filter((e) => (!isLineCategory || !metroSearch.trim() ? true : e.name.toLowerCase().includes(metroSearch.trim().toLowerCase())))
    .filter((e) => (selectedZone === "All" ? true : zoneOf(e) === selectedZone))
    .filter((e) => (selectedNeighborhood === "All" ? true : e.neighborhood === selectedNeighborhood))
    .filter((e) => (selectedSubcategory === "All" ? true : subcategoryKey(e.subcategory || "") === subcategoryKey(selectedSubcategory)))
    .filter((e) => !openOnly || getOpenStatus(e.open_hours).state === "open")
    .slice()
    .sort((a, b) => {
      if (!sortByDistance || !userLocation) return 0
      const da = distMeters(a) ?? Infinity
      const db = distMeters(b) ?? Infinity
      return da - db
    })

  // ---- Nitbus: datos para el mapa (31/10/2026) ----
  // Las paradas que se ven (línea elegida y búsqueda), sin el orden por distancia: así la lista de
  // puntos que se le pasa al mapa solo cambia cuando cambia el filtro, no cada vez que se mueve algo.
  const nbStops = useMemo<NitbusMapStop[]>(() => {
    if (category !== "nitbus") return []
    const q = metroSearch.trim().toLowerCase()
    return essentials
      .filter((e) => e.latitude && e.longitude)
      .filter((e) => selectedMetroLine === "All" || (e.subcategory || "").split(",").some((l) => l.trim().toUpperCase() === selectedMetroLine.toUpperCase()))
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .map((e) => ({
        id: e.id,
        name: e.name,
        lat: Number(e.latitude),
        lon: Number(e.longitude),
        lines: (e.subcategory || "").split(",").map((l) => l.trim().toUpperCase()).filter(Boolean),
      }))
  }, [category, essentials, selectedMetroLine, metroSearch])
  // Las 3 más cercanas a ti, con su distancia.
  const nbNearest = useMemo(
    () =>
      userLocation
        ? nbStops
            .map((s) => ({ s, d: distanceInMeters(userLocation.lat, userLocation.lng, s.lat, s.lon) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
        : [],
    [nbStops, userLocation]
  )
  const nbNearestStops = useMemo(() => nbNearest.map((n) => n.s), [nbNearest])
  const nbSelected = useMemo<NitbusMapStop | null>(
    () =>
      category === "nitbus" && selected && selected.latitude && selected.longitude
        ? {
            id: selected.id,
            name: selected.name,
            lat: Number(selected.latitude),
            lon: Number(selected.longitude),
            lines: (selected.subcategory || "").split(",").map((l) => l.trim().toUpperCase()).filter(Boolean),
          }
        : null,
    [category, selected]
  )
  const nbFitKey = selectedMetroLine === "All" && metroSearch.trim().length < 2 ? "" : `${selectedMetroLine}|${metroSearch.trim().toLowerCase()}`
  // Si la parada más cercana está a más de 20 km (fuera de Barcelona) no se acerca el mapa al usuario.
  const nbFar = nbNearest.length > 0 && nbNearest[0].d > 20000

  // Línea(s) de metro o ruta(s) de Nitbus de un esencial, para no repetir la lógica entre la
  // tarjeta de la lista y la ficha que sale al tocar su chincheta en el mapa — antes el mapa no
  // enseñaba esto y era la mitad de la información (dónde está la parada, sí; a dónde va, no).
  const renderTransitInfo = (item: Essential, stopPropagation?: (e: React.MouseEvent) => void) => {
    if (category === "nitbus" && item.subcategory) {
      const codes = item.subcategory.split(",").map((raw) => raw.trim()).filter(Boolean)
      return (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
          {codes.map((code) => (
            <NitbusRouteRow
              key={code}
              code={code}
              seeStopsLabel={t("clubPage.seeStops")}
              unknownLabel={t("clubPage.lineUnknown")}
              onLinkClick={stopPropagation}
              near={item.latitude != null && item.longitude != null ? { lat: Number(item.latitude), lon: Number(item.longitude) } : undefined}
            />
          ))}
        </div>
      )
    }
    if (category === "metro" && item.subcategory) {
      const lines = item.subcategory.split(",").map((l) => l.trim()).filter(Boolean)
      return (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
          {lines.map((l) => (
            <MetroLineBadge key={l} code={l} />
          ))}
        </div>
      )
    }
    return null
  }

  const renderCard = (item: Essential) => {
    const hasCoords = Boolean(item.latitude && item.longitude)

    const dMeters = distMeters(item)
    const distanceLabel = dMeters != null ? distanceText(dMeters) : ""
    const directionsHref = hasCoords ? directionsFor(item) : ""

    const reportHref = "/contact?type=report_issue&subject=" + encodeURIComponent(`${t("essentialsPage.reportPrefix")} ${item.name}`)
    const isSelected = selected != null && selected.id === item.id

    const handleCardClick = () => {
      setSelected(item)
      if (category === "nitbus") {
        // El mapa de Nitbus está encima de la lista: se sube hasta él para ver la parada.
        document.getElementById("nitbus-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      setMobileView("map")
      if (hasCoords) {
        map.current?.flyTo({ center: [item.longitude as number, item.latitude as number], zoom: 16, duration: 800 })
      }
    }

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

    const status = getOpenStatus(item.open_hours, t)

    // Fila compacta (antes una tarjeta con foto de 160 px por sitio: con 40 farmacias, metros de
    // scroll para encontrar la más cercana).
    return (
      <div
        key={item.id}
        onClick={handleCardClick}
        className={`flex cursor-pointer gap-4 rounded-card border p-4 transition ${isSelected ? "border-brand/60 bg-brand/10" : "border-white/10 bg-surface hover:border-white/25"}`}
      >
        {/* Metro: de 155 estaciones solo unas pocas llevan foto propia (las que alguien cargó a
            mano) — mezclar fotos reales con el icono genérico en la misma lista quedaba
            descuadrado (unas con foto, otras con un simple tren). Mejor que las 155 se vean igual:
            siempre el icono, nunca la foto, aunque alguna la tenga. */}
        <EssentialPhoto src={category === "metro" ? null : item.image} alt={item.name} icon={<CatIcon size={24} />} color={config.color} className="h-16 w-16 shrink-0 rounded-ctl" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-ink">{item.name}</h3>
          {item.highFee && <span className="mt-1 inline-block rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">{t("essentialsPage.highFee")}</span>}
          {!isLineCategory && (
            <p className="mt-0.5 truncate text-sm text-zinc-400">{[item.neighborhood, item.address].filter(Boolean).join(" · ")}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
            {status.label && <span className={status.state === "open" ? (status.soon ? "text-warn" : "text-open") : "text-zinc-400"}>{status.label}</span>}
            {distanceLabel && <span className="text-brand-soft">{distanceLabel}</span>}
          </div>
          {renderTransitInfo(item, stopPropagation)}
          {item.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{item.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasCoords && (
              <a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={(e) => { stopPropagation(e); trackEssentialClick("essential_directions", item) }} className="flex items-center gap-1.5 rounded-ctl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-strong">
                <Icon name="map" className="h-3.5 w-3.5" /> {t("clubPage.directions")}
              </a>
            )}
            {item.maps_link && (
              <a href={item.maps_link} target="_blank" rel="noopener noreferrer" onClick={(e) => { stopPropagation(e); trackEssentialClick("essential_maps", item) }} className="flex items-center gap-1 rounded-ctl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/5">
                Google Maps <ArrowIcon className="h-3 w-3" />
              </a>
            )}
            <a href={reportHref} onClick={stopPropagation} className="ml-auto rounded-ctl p-2 text-zinc-400 transition hover:text-ink" aria-label={t("clubPage.report")} title={t("clubPage.report")}>
              <Icon name="flag" className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="relative min-h-screen bg-night pb-40 text-ink">
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:pt-10">
          <Link href="/essentials" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-ink">
            <Icon name="back" className="h-4 w-4" /> {t("essentials.title")}
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-ctl bg-brand/15 text-brand-soft">
              <CatIcon size={28} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[1.9rem] leading-tight sm:text-5xl">{label}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {category === "nitbus"
                  ? t("essentialsPage.nitbusLinesCount").replace("{n}", String(Object.keys(NIGHT_BUS_LINES).length)) +
                    (essentials.length > 0 ? ` · ${essentials.length} ${t("essentialsPage.nitbusStops")}` : "")
                  : loading
                  ? t("essentialsPage.loading")
                  : `${filteredEssentials.length} ${filteredEssentials.length !== 1 ? t("essentials.locations_plural") : t("essentials.locations")}`}
              </p>
            </div>
          </div>
        </section>

        {/* Panel de contexto: pedir taxi ya / horario del metro */}
        {category === "taxi" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="rounded-card border border-white/10 bg-surface p-5">
              <p className="mb-3 text-sm font-semibold text-ink">{t("essentialsPage.taxiNow")}</p>
              <div className="flex flex-wrap gap-2.5">
                {TAXI_APPS.map((app) => (
                  <a
                    key={app.name}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-ctl border border-white/15 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/5"
                  >
                    {app.name} <ArrowIcon className="h-3.5 w-3.5" />
                  </a>
                ))}
                {TAXI_PHONES.map((p) => (
                  <a
                    key={p.name}
                    href={`tel:${p.phone}`}
                    className="flex items-center gap-1.5 rounded-ctl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
                  >
                    <Icon name="phone" className="h-4 w-4" /> {p.name}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                {filteredEssentials.length > 0 ? t("essentialsPage.taxiRanksHint") : t("essentialsPage.taxiNoRanks")}
              </p>
            </div>
          </section>
        )}

        {category === "metro" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="rounded-card border border-white/10 bg-surface p-5">
              <p className="mb-2 text-sm font-semibold text-zinc-300">{t("essentialsPage.metroTitle")}</p>
              <p className="text-lg font-semibold text-ink">{metroLabel}</p>
              <p className="mt-1 text-xs text-zinc-400">{t("essentialsPage.metroRules")}</p>
            </div>
          </section>
        )}

        {/* Red completa de Nitbus (todas las líneas, con destino real) — siempre visible, no
            depende de que haya paradas cargadas en el admin, porque esa información (a dónde va
            cada línea) no cambia según la parada. */}
        {category === "nitbus" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            {/* Entrada a las paradas por línea, en orden (31/10/2026): el mapa de más de mil
                chinchetas de abajo no sirve para saber por dónde pasa cada línea. */}
            <Link
              href="/nitbus"
              className="mb-4 flex items-center gap-4 rounded-card border border-brand/40 bg-brand/[0.08] p-5 transition hover:border-brand/70"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-ink">{t("nitbusPage.ctaTitle")}</span>
                <span className="mt-1 block text-sm leading-snug text-zinc-300">{t("nitbusPage.ctaBody")}</span>
              </span>
              <span className="shrink-0 rounded-ctl bg-brand px-4 py-2.5 text-sm font-semibold text-white">{t("nitbusPage.ctaButton")}</span>
            </Link>
            <div className="rounded-card border border-white/10 bg-surface p-5">
              <p className="mb-2 text-sm font-semibold text-ink">{t("essentialsPage.nitbusLine")}</p>
              <p className="text-lg font-semibold text-ink">{t("essentialsPage.nitbusHours")}</p>
              <p className="mt-1 text-xs text-zinc-400">{t("essentialsPage.nitbusHoursNote")}</p>
              {/* Con paradas cargadas, lo importante es el buscador y el mapa de abajo: la lista de
                  las 23 líneas queda plegada para no empujarlos fuera de la pantalla. */}
              <details open={essentials.length === 0} className="group mt-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-brand-soft">
                  {t("essentialsPage.nitbusAllLines")} <span className="inline-block transition group-open:rotate-90">›</span>
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                  {Object.values(NIGHT_BUS_LINES).map((line) => (
                    <NitbusRouteRow key={line.code} code={line.code} seeStopsLabel={t("clubPage.seeStops")} unknownLabel={t("clubPage.lineUnknown")} />
                  ))}
                </div>
                <p className="mt-4 text-xs text-zinc-400">{t("essentialsPage.nitbusBody")}</p>
              </details>
            </div>
          </section>
        )}

        {/* Nitbus con paradas: buscar parada y filtrar por línea, igual que el metro. */}
        {category === "nitbus" && essentials.length > 0 && (
          <section ref={linesSectionRef} className="mx-auto mt-6 max-w-7xl scroll-mt-24 px-4">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={metroSearch}
                onChange={(e) => setMetroSearch(e.target.value)}
                placeholder={t("essentialsPage.nitbusSearchPlaceholder")}
                className="w-full rounded-ctl border border-white/10 bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-zinc-500 outline-none focus:border-brand/50"
              />
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setSelectedMetroLine("All")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedMetroLine === "All" ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
                }`}
              >
                {t("essentialsPage.allLines")}
              </button>
              {nitbusCodesPresent.map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedMetroLine(code)}
                  aria-label={code}
                  className={`shrink-0 rounded-lg p-0.5 transition ${selectedMetroLine === code ? "ring-2 ring-white" : "opacity-70 hover:opacity-100"}`}
                >
                  <NitbusBadge code={code} size="md" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Metro: con 155 estaciones, una lista plana no se puede ni leer ni buscar. Se puede
            buscar por nombre o filtrar por línea, como en el plano real — el mapa y la lista se
            quedan solo con esa línea, en vez de perderse entre las otras 140 chinchetas. */}
        {category === "metro" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={metroSearch}
                onChange={(e) => setMetroSearch(e.target.value)}
                placeholder={t("essentialsPage.metroSearchPlaceholder")}
                className="w-full rounded-ctl border border-white/10 bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-zinc-500 outline-none focus:border-brand/50"
              />
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setSelectedMetroLine("All")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedMetroLine === "All" ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
                }`}
              >
                {t("essentialsPage.allLines")}
              </button>
              {METRO_LINE_ORDER.map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedMetroLine(code)}
                  aria-label={code}
                  className={`shrink-0 rounded-full p-0.5 transition ${selectedMetroLine === code ? "ring-2 ring-white" : "opacity-70 hover:opacity-100"}`}
                >
                  <MetroLineBadge code={code} size="md" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Filters — en Nitbus no hay nada que filtrar: el roster de arriba ya es toda la
            información, así que esta sección entera (y la de abajo) no se enseña para esa
            categoría, en vez de enseñar filtros y un mapa vacíos de paradas sueltas sin sentido. */}
        {category !== "nitbus" && (
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* En Metro el barrio/zona de cada estación no es un dato útil para filtrar: la red
                cubre toda Barcelona y el filtro no "lleva a nada" (deja la lista casi vacía o
                igual, porque las estaciones del catálogo no tienen barrio asignado). Para eso ya
                está el filtro por línea de arriba. */}
            {/* Zona, barrio y tipo en desplegables (31/10/2026): antes eran tres filas de chips
                sueltos —en Comida, decenas de barrios en fila— que llenaban la pantalla. Ahora cada
                filtro es un desplegable (el del móvil abre la lista nativa) y, si tiene algo
                elegido, se marca en el color de la marca. En Metro y Nitbus no hay (filtran por
                línea, arriba). */}
            {!isLineCategory && availableZones.length > 1 && (
              <FilterSelect
                value={selectedZone}
                onChange={(z) => {
                  setSelectedZone(z)
                  setSelectedNeighborhood("All")
                }}
                options={[{ value: "All", label: t("essentialsPage.allArea") }, ...availableZones.map((z) => ({ value: z, label: z }))]}
              />
            )}
            {!isLineCategory && neighborhoods.length > 2 && (
              <FilterSelect
                value={selectedNeighborhood}
                onChange={setSelectedNeighborhood}
                options={neighborhoods.map((n) => ({ value: n || "All", label: n === "All" ? t("essentialsPage.allBarrios") : String(n) }))}
              />
            )}
            {availableSubcategories.length > 1 && (
              <FilterSelect
                value={selectedSubcategory}
                onChange={setSelectedSubcategory}
                options={[{ value: "All", label: t("essentialsPage.allSubcategories") }, ...availableSubcategories.map((sub) => ({ value: sub, label: sub }))]}
              />
            )}
            <div className="flex w-full gap-2.5 sm:w-auto">
              <button
                onClick={() => (userLocation ? setSortByDistance(!sortByDistance) : locateMe())}
                disabled={locating}
                className={`h-11 flex-1 shrink-0 whitespace-nowrap rounded-full px-4 text-center text-sm font-semibold transition sm:flex-none ${
                  userLocation && sortByDistance ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
                }`}
              >
                {locating ? t("explorer.locating") : userLocation ? t("explorer.sortDistance") : t("explorer.near")}
              </button>
              {/* En Nitbus no hay «Abierto ahora» (31/10/2026): una parada no tiene horario, el filtro
                  no servía para nada. */}
              {category !== "nitbus" && (
                <button
                  onClick={() => setOpenOnly(!openOnly)}
                  aria-pressed={openOnly}
                  className={`h-11 flex-1 shrink-0 whitespace-nowrap rounded-full px-4 text-center text-sm font-semibold transition sm:flex-none ${
                    openOnly ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  {t("explorer.now")}
                </button>
              )}
            </div>
          </div>

          {locationDenied && (
            <p className="mt-3 text-sm text-warn">{t("geo.denied")}</p>
          )}
          {locationFail && <p className="mt-3 text-sm text-warn">{t("geo.error")}</p>}
          {userAccuracy != null && userAccuracy > 150 && (
            <p className="mt-3 text-sm text-zinc-400">{t("geo.approximate").replace("{n}", String(Math.round(userAccuracy / 10) * 10))}</p>
          )}
          {farAway && (
            <p className="mt-3 text-sm text-zinc-400">{t("essentialsPage.farAway")}</p>
          )}

          {/* Toggle lista/mapa — solo móvil */}
          <div className={`mt-3 gap-1 rounded-full border border-white/10 bg-surface p-1 ${category === "nitbus" ? "hidden" : "flex md:hidden"}`}>
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                aria-pressed={mobileView === v}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${mobileView === v ? "bg-white text-night" : "text-zinc-300"}`}
              >
                {v === "list" ? t("essentialsPage.list") : t("nav.map")}
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Nitbus: mapa de paradas para encontrar la más cercana (31/10/2026). Ver NitbusStopsMap. */}
        {category === "nitbus" && essentials.length > 0 && (
          <section className="mx-auto mt-5 max-w-7xl px-4">
            <NitbusStopsMap
              id="nitbus-map"
              className="h-[58dvh] min-h-[380px] scroll-mt-20 md:h-[560px]"
              stops={nbStops}
              selected={nbSelected}
              onSelect={(id) => setSelected(id == null ? null : essentials.find((e) => e.id === id) ?? null)}
              user={userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userAccuracy } : null}
              nearest={nbNearestStops}
              fitKey={nbFitKey}
              userFitNonce={nbFar ? 0 : userFixNonce}
              locating={locating}
              onLocate={locateMe}
            >
              {selected && (
                <div className="absolute inset-x-3 bottom-9 z-10 max-h-[52%] overflow-y-auto rounded-2xl border border-white/10 bg-night/95 p-4 backdrop-blur-xl">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black leading-snug text-white">{selected.name}</p>
                      {(() => {
                        const d = distMeters(selected)
                        return d != null ? <p className="mt-0.5 text-xs font-semibold text-brand-soft">{distanceText(d)}</p> : null
                      })()}
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white"
                      aria-label={t("clubPage.close")}
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-zinc-400">{t("essentialsPage.nitbusLinesHere")}</p>
                  {renderTransitInfo(selected)}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {selected.latitude && selected.longitude && (
                      <a
                        href={`${directionsFor(selected)}&travelmode=walking`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEssentialClick("essential_directions", selected)}
                        className="flex items-center gap-1.5 rounded-ctl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-strong"
                      >
                        <Icon name="map" className="h-3.5 w-3.5" /> {t("clubPage.directions")}
                      </a>
                    )}
                    {selected.id > 0 && <AdminEditButton kind="essential" id={selected.id} inline />}
                  </div>
                </div>
              )}
            </NitbusStopsMap>

            {locationDenied && <p className="mt-3 text-sm text-warn">{t("geo.denied")}</p>}
            {locationFail && <p className="mt-3 text-sm text-warn">{t("geo.error")}</p>}
            {userAccuracy != null && userAccuracy > 150 && (
              <p className="mt-3 text-sm text-zinc-400">{t("geo.approximate").replace("{n}", String(Math.round(userAccuracy / 10) * 10))}</p>
            )}
            {nbFar && <p className="mt-3 text-sm text-zinc-400">{t("essentialsPage.farAway")}</p>}

            {/* Tus 3 paradas más cercanas, con las líneas que paran en cada una. */}
            {userLocation && nbNearest.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t("essentialsPage.nitbusNearest")}</p>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {nbNearest.map(({ s: stop, d }, i) => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setSelected(essentials.find((e) => e.id === stop.id) ?? null)
                        document.getElementById("nitbus-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                      className={`flex items-start gap-3 rounded-card border p-3 text-left transition ${
                        selected?.id === stop.id ? "border-brand/60 bg-brand/10" : "border-white/10 bg-surface hover:border-white/25"
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black"
                        style={{ background: NITBUS_PLATE.fg, color: NITBUS_PLATE.bg }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-ink">{stop.name}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-brand-soft">{distanceText(d)}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                          {stop.lines.slice(0, 5).map((c) => (
                            <NitbusBadge key={c} code={c} />
                          ))}
                          {stop.lines.length > 5 && <span className="text-xs text-zinc-400">+{stop.lines.length - 5}</span>}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">{t("essentialsPage.nitbusLocateHint")}</p>
            )}
          </section>
        )}

        {/* Content: lista + mapa lado a lado en escritorio. En Nitbus el mapa es otro (NitbusStopsMap,
            arriba) y aquí solo queda la lista de paradas, a todo el ancho. El mapa de esta página
            nunca llegaba a crearse en Nitbus: su contenedor aparece cuando cargan las paradas y el
            mapa se crea una sola vez al montar la página. */}
        {(category !== "nitbus" || essentials.length > 0) && (
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className={category === "nitbus" ? "md:col-span-12" : `md:col-span-5 ${mobileView === "map" ? "hidden md:block" : ""}`}>
              {category === "nitbus" && (
                <h2 className="mb-3 text-lg font-semibold text-ink">
                  {t("essentialsPage.nitbusAllStops")} <span className="text-sm font-normal text-zinc-400">· {filteredEssentials.length}</span>
                </h2>
              )}
              {loading ? (
                <div className="grid gap-3">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-card bg-surface" />)}
                </div>
              ) : filteredEssentials.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-lg font-semibold text-zinc-200">{t("essentialsPage.noFilterResults")}</p>
                </div>
              ) : (
                <>
                  <div className={category === "nitbus" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-3 md:max-h-[640px] md:overflow-y-auto md:pr-1 [scrollbar-width:thin]"}>
                    {(category === "nitbus" ? filteredEssentials.slice(0, nbLimit) : filteredEssentials).map((item) => renderCard(item))}
                  </div>
                  {category === "nitbus" && filteredEssentials.length > nbLimit && (
                    <button
                      type="button"
                      onClick={() => setNbLimit((n) => n + NB_PAGE * 2)}
                      className="mt-4 w-full rounded-full border border-white/10 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
                    >
                      {t("essentialsPage.moreStops").replace("{n}", String(filteredEssentials.length - nbLimit))}
                    </button>
                  )}
                </>
              )}
            </div>

            {category !== "nitbus" && (
            <div className={`md:col-span-7 ${mobileView === "list" ? "hidden md:block" : ""}`}>
              <div
                ref={mapWrapperRef}
                className="relative h-[58dvh] min-h-[360px] scroll-mt-20 overflow-hidden rounded-card border border-white/10 md:sticky md:top-24 md:h-[640px]"
              >
                <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

                {mapHint && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/50 md:hidden">
                    <p className="rounded-full bg-night/90 px-5 py-2.5 text-sm font-semibold text-ink">{t("essentialsPage.twoFingers")}</p>
                  </div>
                )}

                {/* Salida clara del mapa en el móvil: antes solo se podía volver con el selector de arriba */}
                <button
                  onClick={() => setMobileView("list")}
                  className="absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-night/85 px-4 py-2 text-xs font-semibold text-ink backdrop-blur-md md:hidden"
                >
                  {t("essentialsPage.list")}
                </button>

                {/* Ficha del sitio tocado: foto grande con el nombre encima, como en el mapa de clubs */}
                {selected && (
                  <div className="absolute inset-x-3 bottom-3 overflow-hidden rounded-2xl border border-white/10 bg-night/95 backdrop-blur-xl">
                    <div className="relative">
                      <EssentialPhoto src={selected.image} alt={selected.name} icon={<CatIcon size={32} />} color={config.color} className="h-28 w-full md:h-36" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night via-black/25 to-transparent" />
                      <button
                        onClick={() => setSelected(null)}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md"
                        aria-label={t("clubPage.close")}
                      >
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                        <p className="truncate text-base font-black text-white">{selected.name}</p>
                        {selected.highFee && <p className="text-xs font-semibold text-warn">{t("essentialsPage.highFee")}</p>}
                        {selected.address && <p className="truncate text-xs text-zinc-300">{selected.address}</p>}
                      </div>
                    </div>
                    <div className="px-4 pb-4 pt-2">
                      {renderTransitInfo(selected)}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {(() => {
                          const st = getOpenStatus(selected.open_hours, t)
                          if (!st.label) return null
                          const cls = st.state === "open" ? (st.soon ? "bg-warn/15 text-warn" : "bg-open/15 text-open") : "bg-white/10 text-zinc-300"
                          return <span className={`rounded-full px-2.5 py-1 font-semibold ${cls}`}>{st.label}</span>
                        })()}
                        {(() => {
                          const d = distMeters(selected)
                          return d != null ? (
                            <span className="rounded-full bg-brand/15 px-2.5 py-1 font-semibold text-brand-soft">{distanceText(d)}</span>
                          ) : null
                        })()}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selected.latitude && selected.longitude && (
                          <a
                            href={directionsFor(selected)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEssentialClick("essential_directions", selected)}
                            className="flex items-center gap-1.5 rounded-ctl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-strong"
                          >
                            <Icon name="map" className="h-3.5 w-3.5" /> {t("clubPage.directions")}
                          </a>
                        )}
                        {/* id negativo = estación del catálogo fijo de metro, no una fila real del admin */}
                        {selected.id > 0 && <AdminEditButton kind="essential" id={selected.id} inline />}
                        {selected.maps_link && (
                          <a
                            href={selected.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEssentialClick("essential_maps", selected)}
                            className="rounded-ctl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/5"
                          >
                            Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </section>
        )}
      </main>
      {/* Acceso rápido al mapa mientras se mira la lista (solo móvil) */}
      {category !== "nitbus" && mobileView === "list" && !loading && essentials.length > 0 && (
        <button
          onClick={() => setMobileView("map")}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-night shadow-lg md:hidden"
        >
          {t("essentialsPage.seeMap")}
        </button>
      )}
      <BottomNav />
    </>
  )
}
