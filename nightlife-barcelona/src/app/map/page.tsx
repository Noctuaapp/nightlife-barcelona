"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"
import BottomNav from "../../components/layout/BottomNav"
import LoginWall from "../../components/ui/LoginWall"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"
import ArrowIcon from "../../components/ui/ArrowIcon"
import { zoneOf, zonesPresent } from "../../lib/zones"
import { categoryRank, categoryNameKey, categoryInfo } from "../../lib/essentialCategories"
import { distanceInMeters, formatDistance } from "../../lib/geo"
import { Disc3, CalendarDays, MapPin, Footprints, X, List, LocateFixed, Search, type LucideIcon } from "lucide-react"
import { logError } from "../../lib/log"
import { getOpenStatus } from "../../lib/openStatus"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"
import { renderToStaticMarkup } from "react-dom/server"

// "Taxi" y "Transport" ya no son categorías de esenciales (ver essentialCategories.ts y
// ClubTransport.tsx): no informaban de nada útil como sitio al que ir a pie (Taxi solo oficinas
// de Uber/Cabify/Bolt; Transport solo el Aerobus) y pedir un taxi ya funciona desde la ficha de
// cada club. La lista de categorías y la ficha de club ya las excluían, pero este mapa general
// cargaba `essentials` sin filtrar nada — mismo filtro aquí.
const NOT_A_RANK = /cabify|uber|bolt|free\s?now|oficina|office|headquarter/i

type Club = {
  id: number
  name: string
  slug?: string | null
  neighborhood: string | null
  music: string | null
  hours: string | null
  price: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  image: string | null
}

type Event = {
  id: number
  title: string
  slug?: string | null
  date: string | null
  price: string | null
  image: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
}

type Essential = {
  id: number
  name: string
  category: string
  neighborhood: string | null
  open_hours: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
}

type Filter = "clubs" | "events" | "essentials"

// Semáforo de los esenciales en el mapa.
const STATUS_COLORS = { open: "#16a34a", soon: "#eab308", closed: "#dc2626" }

const COLORS: Record<Filter, string> = {
  clubs: "#7c5cff",
  events: "#7c5cff",
  essentials: "#7c5cff",
}

// Iconos de línea por tipo (antes emojis).
const FILTER_ICONS: Record<Filter, LucideIcon> = {
  clubs: Disc3,
  events: CalendarDays,
  essentials: MapPin,
}
const FilterIcon = ({ f, size = 14 }: { f: Filter; size?: number }) => {
  const I = FILTER_ICONS[f]
  return <I size={size} aria-hidden="true" />
}

// Botón principal "Ver club/evento": antes era un rectángulo de esquinas suaves con un "→" de
// texto pegado al final. Ahora es una píldora completa (rounded-full, como el resto de CTAs de
// la app: banner del header, Crear cuenta...) con el nombre a la izquierda y un círculo de
// flecha a la derecha — el mismo lenguaje del botón circular que ya usamos en las cards de
// clubs y esenciales de la home, para que todo el sitio se sienta como un único producto.
const viewButtonStyle: CSSProperties = {
  marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between",
  borderRadius: "999px", background: "#7c5cff",
  padding: "6px 6px 6px 22px", fontSize: "13.5px", fontWeight: 800, color: "#fff",
  textDecoration: "none", letterSpacing: "0.01em",
  boxShadow: "0 14px 30px -12px rgba(124,92,255,0.6)",
}

const arrowCircleStyle: CSSProperties = {
  width: "34px", height: "34px", borderRadius: "50%", background: "rgba(255,255,255,0.22)",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)", flexShrink: 0,
}

const getImage = (item: Club | Event | Essential): string | null => {
  if ("image" in item) return (item as Club | Event).image
  return null
}

const getInitials = (label: string | null | undefined) =>
  (label || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

const SearchInput = ({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent?: string }) => {
  const { t } = useLanguage()
  return (
  <div style={{ position: "relative" }}>
    <input
      type="text"
      placeholder={`${t("common.search")}...`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => { e.currentTarget.style.borderColor = accent || "rgba(255,255,255,0.3)"; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent || "rgba(255,255,255,0.1)"}22` }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none" }}
      style={{
        width: "100%", background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px",
        padding: "11px 36px 11px 14px", fontSize: "13px", color: "#fff",
        outline: "none", boxSizing: "border-box", transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    />
    <svg style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
  )
}

// Un <select> nativo se veía mal aquí: el desplegable de opciones lo pinta el sistema operativo
// en blanco, sin seguir el tema oscuro de la app, y en móvil tapaba la lista de resultados de
// forma rara. Este es un desplegable propio (botón + lista flotante) con el mismo estilo que el
// resto del mapa, para que combine igual en todos los navegadores.
const FilterSelect = ({ value, options, onChange, placeholder, accent }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder: string; accent: string }) => {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", borderRadius: "10px", border: open ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "12px", fontWeight: 600,
          padding: "7px 24px 7px 10px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", position: "relative", boxSizing: "border-box" }}>
        {current ? current.label : placeholder}
        <span style={{ position: "absolute", right: "8px", top: "50%", transform: open ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)", pointerEvents: "none", fontSize: "9px", color: "rgba(255,255,255,0.5)", transition: "transform 0.15s ease" }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, maxHeight: "240px", overflowY: "auto", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(13,10,28,0.98)", backdropFilter: "blur(16px)", boxShadow: "0 16px 40px -14px rgba(0,0,0,0.85)" }}>
            {options.map((o) => (
              <button key={o.value || "all"} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", fontSize: "13px",
                  fontWeight: o.value === value ? 700 : 500, color: o.value === value ? "#fff" : "rgba(255,255,255,0.7)",
                  background: o.value === value ? `${accent}22` : "none", border: "none", cursor: "pointer" }}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Búsqueda sin tildes ni mayúsculas para el buscador flotante del mapa.
const normQ = (v: string) =>
  (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()

const getName = (item: Club | Event | Essential) => ("name" in item ? item.name : item.title)
const getSub = (item: Club | Event | Essential) => {
  if ("music" in item) return item.neighborhood || ""
  if ("title" in item && "date" in item) return (item as Event).date || ""
  if ("category" in item) return (item as Essential).category || ""
  return ""
}

// Un dato breve y útil por tipo, en vez de los botones de Uber/Cabify/Free Now (quitados: no
// aportaban nada a la decisión de "¿voy o no voy?" y ocupaban media tarjeta). Un club enseña
// género musical y precio, un evento su precio, un esencial su horario — solo si el dato existe.
const getMeta = (item: Club | Event | Essential, filter: Filter): string | null => {
  if (filter === "clubs" && "music" in item) {
    const parts = [item.music, item.price].filter(Boolean)
    return parts.length ? parts.join(" · ") : null
  }
  if (filter === "events" && "price" in item) return item.price || null
  if (filter === "essentials" && "open_hours" in item) return item.open_hours || null
  return null
}

// Tarjeta de detalle compartida entre el panel de escritorio (siempre visible, a la izquierda
// del mapa) y la ficha flotante de móvil (aparece al pulsar un pin). Antes cada una tenía su
// propio JSX duplicado con la imagen y el texto apilados debajo, sin relación entre ambos. Ahora
// la foto es una "hero image": el nombre va superpuesto sobre ella con degradado de legibilidad,
// más un badge de categoría arriba — el mismo lenguaje editorial que ya usan las cards de eventos
// de la home, en vez de una imagen-banner seguida de texto plano.
const DetailCard = ({
  item, filter, walkingTime, onClose, showHandle, t,
}: {
  item: Club | Event | Essential
  filter: Filter
  walkingTime: string | null
  onClose?: () => void
  showHandle?: boolean
  t: (key: string) => string
}) => {
  const color = COLORS[filter]
  const name = getName(item)
  const sub = getSub(item)
  const image = getImage(item)
  const address = "address" in item ? item.address : null
  const meta = getMeta(item, filter)

  return (
    <>
      {showHandle && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "999px", background: "rgba(255,255,255,0.2)" }} />
        </div>
      )}

      <div style={{ position: "relative", borderRadius: "18px", overflow: "hidden" }}>
        {image ? (
          <img src={image} alt={name} style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "160px", background: `linear-gradient(135deg, ${color}55, #16141f)`, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>
            <FilterIcon f={filter} size={40} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.92) 100%)" }} />
        <div style={{
          position: "absolute", left: "12px", top: "12px", borderRadius: "999px", padding: "5px 12px",
          fontSize: "12px", fontWeight: 600, color: "#fff", background: "rgba(10,9,16,0.75)",
          border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <FilterIcon f={filter} size={12} /> {t(`nav.${filter}`)}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t("clubPage.close")}
            style={{ position: "absolute", top: "10px", right: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", color: "#fff", background: "rgba(10,9,16,0.75)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        )}
        <div style={{ position: "absolute", left: "16px", right: "16px", bottom: "13px" }}>
          <p style={{ fontWeight: 900, color: "#fff", fontSize: "19px", letterSpacing: "-0.01em", textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>{name}</p>
          {sub && <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.8)", marginTop: "3px", textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>{sub}</p>}
        </div>
      </div>

      {meta && (
        <p style={{ marginTop: "13px", fontSize: "13px", fontWeight: 600, color: "#d4d3dc" }}>
          {meta}
        </p>
      )}

      {(address || walkingTime) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
          {address && (
            <span style={{ fontSize: "12px", color: "#a19fad", display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={12} /> {address}
            </span>
          )}
          {walkingTime && (
            <span style={{ fontSize: "12px", color: "#a08bff", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <Footprints size={12} /> {walkingTime}
            </span>
          )}
        </div>
      )}

      {filter === "clubs" && (
        <Link href={`/clubs/${("slug" in item && item.slug) || createSlug(name)}`} style={viewButtonStyle}>
          {t("map.viewClub")}
          <span style={arrowCircleStyle}><ArrowIcon className="h-3.5 w-3.5" /></span>
        </Link>
      )}
      {filter === "events" && (
        <Link href={`/event/${("slug" in item && item.slug) || createSlug(name)}`} style={viewButtonStyle}>
          {t("map.viewEvent")}
          <span style={arrowCircleStyle}><ArrowIcon className="h-3.5 w-3.5" /></span>
        </Link>
      )}
    </>
  )
}

export default function MapPage() {
  const { t } = useLanguage()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const routeLayerRef = useRef<boolean>(false)
  const urlHandledRef = useRef(false)
  const searchParams = useSearchParams()

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [filter, setFilter] = useState<Filter>("clubs")
  const [selected, setSelected] = useState<Club | Event | Essential | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [showList, setShowList] = useState(true)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [search, setSearch] = useState("")
  const [zone, setZone] = useState("")
  const [category, setCategory] = useState("")
  const [mapQuery, setMapQuery] = useState("")
  const [mapSearchOpen, setMapSearchOpen] = useState(false)
  const mapSearchRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setZone(""); setCategory("") }, [filter])
  // El buscador flotante se quedaba abierto para siempre: antes solo se cerraba al borrar el
  // texto o elegir un resultado, así que si lo abrías sin escribir nada (p. ej. para "usar mi
  // ubicación") no había forma de cerrarlo ni volviendo a pulsarlo (ya estaba enfocado, así que
  // el evento de foco no se repetía). Ahora un clic fuera lo cierra.
  useEffect(() => {
    if (!mapSearchOpen) return
    const onDocPointerDown = (e: PointerEvent) => {
      if (mapSearchRef.current && !mapSearchRef.current.contains(e.target as Node)) setMapSearchOpen(false)
    }
    document.addEventListener("pointerdown", onDocPointerDown)
    return () => document.removeEventListener("pointerdown", onDocPointerDown)
  }, [mapSearchOpen])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [trackingActive, setTrackingActive] = useState(false)
  const [walkingTime, setWalkingTime] = useState<string | null>(null)

  // Analítica de búsquedas: guarda lo que la gente busca en el mapa (con un pequeño debounce
  // para no insertar una fila por cada letra) para poder verlo luego en el admin.
  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) return
    const timeout = setTimeout(() => {
      track("search", { itemType: filter, itemName: query.toLowerCase().slice(0, 80), meta: { from: "map" } })
    }, 1200)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    const start = Date.now()
    const duration = 300
    const interval = setInterval(() => {
      if (map.current) map.current.resize()
      if (Date.now() - start > duration) clearInterval(interval)
    }, 16)
    return () => clearInterval(interval)
  }, [showList])

  useEffect(() => {
    // El mapa está abierto a todo el mundo (29/10/2026; antes pedía cuenta y sin sesión salía
    // LoginWall). Las dos banderas se quedan por si algún día se vuelve a cerrar: bastaría con
    // volver a leer la sesión aquí. Mapbox cuenta cada carga del mapa, así que conviene mirar el
    // uso en el panel de Mapbox de vez en cuando.
    setLoggedIn(true)
    setIsLoggedIn(true)
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mapContainer.current || map.current) return
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [2.1734, 41.3851],
          zoom: 13,
        })
        map.current.on("load", () => {
          if (map.current) { map.current.resize(); setMapReady(true) }
        })
        window.addEventListener("resize", () => { if (map.current) map.current.resize() })
      })
    })
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      map.current?.remove()
      map.current = null
    }
  }, [loggedIn])

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: clubsData }, { data: eventsData }, { data: essentialsData }] = await Promise.all([
        supabase.from("clubs").select("id, name, slug, neighborhood, music, hours, price, latitude, longitude, address, image").eq("hidden", false),
        // Eventos oculto (lib/featureFlags.ts): no salen en el mapa.
        EVENTS_HIDDEN ? Promise.resolve({ data: [] as any[] }) : supabase.from("events").select("id, title, slug, date, price, image, latitude, longitude, address").eq("hidden", false),
        // Sin las paradas de Nitbus (más de mil chinchetas): tienen su propio mapa en Esenciales › Nitbus.
        supabase.from("essentials").select("id, name, category, neighborhood, open_hours, latitude, longitude, address").eq("hidden", false).neq("category", "Nitbus").limit(5000),
      ])
      if (clubsData) setClubs(clubsData)
      if (eventsData) setEvents(eventsData)
      if (essentialsData) setEssentials(essentialsData.filter((e) => e.category !== "Taxi" && e.category !== "Transport" && !NOT_A_RANK.test(e.name || "")))
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!mapReady || !map.current) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    setSelected(null)
    setWalkingTime(null)
    const color = COLORS[filter]
    // Antes los pines eran el marcador de Mapbox por defecto (una gota de color, todos
    // idénticos) — no había forma de saber qué club era cuál sin pulsarlo uno a uno. Ahora cada
    // pin muestra la foto del club/evento recortada en círculo, o sus iniciales sobre el color
    // de la categoría si no tiene foto.
    const addMarker = (lat: number, lng: number, item: Club | Event | Essential) => {
      const label = "name" in item ? item.name : item.title
      const image = getImage(item)
      const initials = getInitials(label)
      const isEssential = "category" in item

      // Esenciales: el color del pin dice si está abierto (verde), cierra en menos de una hora
      // (amarillo) o ya está cerrado (rojo). Sin horario conocido (metro, Nitbus...), lila.
      let pinColor = color
      let ring = "#fff"
      if (isEssential) {
        const st = getOpenStatus((item as Essential).open_hours)
        const sc = st.state === "open" ? (st.soon ? STATUS_COLORS.soon : STATUS_COLORS.open) : st.state === "closed" ? STATUS_COLORS.closed : null
        if (sc) { pinColor = sc; ring = sc }
      }
      const el = document.createElement("div")
      el.style.cssText = `width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid ${image ? ring : "#fff"}; box-shadow: 0 2px 10px rgba(0,0,0,0.5); cursor: pointer; overflow: hidden; display: flex; align-items: center; justify-content: center; background: ${pinColor}; font-size: 11px; font-weight: 800; color: #fff; font-family: inherit;`
      if (image) {
        const img = document.createElement("img")
        img.src = image
        img.alt = label || ""
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover;"
        el.appendChild(img)
      } else if (isEssential) {
        // Un esencial (farmacia, cajero, metro...) casi nunca tiene foto, así que antes esto era
        // lo que se veía casi siempre: las iniciales del nombre sobre un círculo lila, que no
        // decían nada de qué tipo de sitio era. Ahora usa el mismo icono de categoría que ya se
        // ve en /essentials (essentialCategories.ts) — de un vistazo se distingue una farmacia
        // de un cajero o una parada de metro.
        const Icon = categoryInfo((item as Essential).category).icon
        el.innerHTML = renderToStaticMarkup(<Icon size={17} color="#fff" strokeWidth={2.25} />)
      } else {
        el.textContent = initials
      }

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current!)
      el.addEventListener("click", () => {
        setSelected(item)
        map.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 })
      })
      markersRef.current.push(marker)
    }
    const inZone = (i: { neighborhood?: string | null; address?: string | null }) => !zone || zoneOf(i) === zone
    if (filter === "clubs") clubs.filter((c) => c.latitude && c.longitude && inZone(c)).forEach((c) => addMarker(c.latitude!, c.longitude!, c))
    else if (filter === "events") events.filter((e) => e.latitude && e.longitude && inZone(e)).forEach((e) => addMarker(e.latitude!, e.longitude!, e))
    else if (filter === "essentials") essentials.filter((e) => e.latitude && e.longitude && inZone(e) && (!category || e.category === category)).forEach((e) => addMarker(e.latitude!, e.longitude!, e))
  }, [filter, mapReady, clubs, events, essentials, zone, category])

  useEffect(() => {
    if (urlHandledRef.current || !mapReady) return
    const typeParam = searchParams.get("type") as Filter | null
    const idParam = searchParams.get("id")
    if (!typeParam || !idParam) { urlHandledRef.current = true; return }
    if (typeParam !== filter) { setFilter(typeParam); return }
    const list = typeParam === "clubs" ? clubs : typeParam === "events" ? events : essentials
    if (list.length === 0) return
    const match = list.find((i) => String(i.id) === idParam)
    if (!match) { urlHandledRef.current = true; return }
    urlHandledRef.current = true
    setSelected(match)
    if (match.latitude && match.longitude) {
      map.current?.flyTo({ center: [match.longitude, match.latitude], zoom: 15, duration: 800 })
    }
  }, [mapReady, filter, clubs, events, essentials, searchParams])

  useEffect(() => {
    if (!selected || !userLocation || !map.current || !mapReady) { setWalkingTime(null); return }
    const destLat = selected.latitude
    const destLng = selected.longitude
    if (!destLat || !destLng) return
    const fetchRoute = async () => {
      const [userLng, userLat] = userLocation
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLng},${userLat};${destLng},${destLat}?steps=false&geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      try {
        const res = await fetch(url)
        const data = await res.json()
        const route = data.routes?.[0]
        if (!route) return
        setWalkingTime(`${Math.ceil(route.duration / 60)} ${t("map.walkingSuffix")}`)
        const geojson = route.geometry
        if (map.current!.getSource("route")) {
          ;(map.current!.getSource("route") as mapboxgl.GeoJSONSource).setData(geojson)
        } else {
          map.current!.addSource("route", { type: "geojson", data: geojson })
          map.current!.addLayer({ id: "route", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.8 } })
          routeLayerRef.current = true
        }
      } catch (e) { logError("Route error:", e) }
    }
    fetchRoute()
  }, [selected, userLocation, mapReady])

  const startTracking = () => {
    if (!navigator.geolocation) return
    if (trackingActive) {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      setUserLocation(null)
      setTrackingActive(false)
      setWalkingTime(null)
      if (map.current && routeLayerRef.current) {
        if (map.current.getLayer("route")) map.current.removeLayer("route")
        if (map.current.getSource("route")) map.current.removeSource("route")
        routeLayerRef.current = false
      }
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation([longitude, latitude])
        if (!userMarkerRef.current) {
          const el = document.createElement("div")
          el.style.cssText = `width: 18px; height: 18px; border-radius: 50%; background: #3b82f6; border: 3px solid #fff; box-shadow: 0 0 0 4px rgba(59,130,246,0.3);`
          userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map.current!)
          map.current?.flyTo({ center: [longitude, latitude], zoom: 15, duration: 800 })
        } else {
          userMarkerRef.current.setLngLat([longitude, latitude])
        }
      },
      (err) => logError("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    watchIdRef.current = id
    setTrackingActive(true)
  }

  // Miniatura compartida para las filas de lista y el panel de detalle: foto recortada en
  // círculo si el club/evento tiene, o un círculo degradado con las iniciales si no — así nunca
  // se ve una fila vacía o un hueco gris, coherente con los pines del mapa.
  const renderAvatar = (item: Club | Event | Essential, size: number) => {
    const label = getName(item)
    const image = getImage(item)
    const color = COLORS[filter]
    return image ? (
      <img src={image} alt={label} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)" }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}66)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.32), fontWeight: 800, color: "#fff", flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)" }}>
        {getInitials(label)}
      </div>
    )
  }

  const rawList = filter === "clubs" ? clubs : filter === "events" ? events : essentials
  const zonesAvail = zonesPresent(rawList as { neighborhood?: string | null; address?: string | null }[])
  const categoriesAvail = filter === "essentials"
    ? Array.from(new Set(essentials.map((e) => e.category))).sort((a, b) => categoryRank(a) - categoryRank(b))
    : []
  // En esenciales, con cuatro municipios y diez categorías a la vez, la fila de chips se volvía
  // larga e ilegible — dos desplegables (zona y categoría) son más compactos y claros para cruzar
  // ambos filtros. Clubs/eventos solo tienen zona, así que ahí se mantienen los chips de siempre.
  const filterChips = filter === "essentials" ? (
    (zonesAvail.length > 1 || categoriesAvail.length > 1) && (
      <div style={{ display: "flex", gap: "6px", paddingTop: "10px", paddingBottom: "2px" }}>
        {zonesAvail.length > 1 && (
          <FilterSelect
            accent={COLORS[filter]}
            placeholder={t("essentialsPage.allArea")}
            value={zone}
            onChange={setZone}
            options={[{ value: "", label: t("essentialsPage.allArea") }, ...zonesAvail.map((z) => ({ value: z, label: z.replace(" de Llobregat", "").replace(" de Besòs", "").replace(" de Gramenet", "") }))]}
          />
        )}
        {categoriesAvail.length > 1 && (
          <FilterSelect
            accent={COLORS[filter]}
            placeholder={t("essentialsPage.allCategories")}
            value={category}
            onChange={setCategory}
            options={[{ value: "", label: t("essentialsPage.allCategories") }, ...categoriesAvail.map((c) => ({ value: c, label: t(categoryNameKey(c)) }))]}
          />
        )}
      </div>
    )
  ) : (
    zonesAvail.length > 1 ? (
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingTop: "10px", paddingBottom: "2px" }}>
        {["", ...zonesAvail].map((z) => (
          <button key={z || "all"} onClick={() => setZone(z)}
            style={{ flexShrink: 0, borderRadius: "9999px", padding: "5px 11px", fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              border: zone === z ? `1px solid ${COLORS[filter]}` : "1px solid rgba(255,255,255,0.12)",
              background: zone === z ? `${COLORS[filter]}33` : "rgba(255,255,255,0.04)",
              color: zone === z ? "#fff" : "rgba(255,255,255,0.55)" }}>
            {z === "" ? t("essentialsPage.allArea") : z.replace(" de Llobregat", "").replace(" de Besòs", "").replace(" de Gramenet", "")}
          </button>
        ))}
      </div>
    ) : null
  )
  const currentList = rawList.filter((item) => {
    if (zone && zoneOf(item as { neighborhood?: string | null; address?: string | null }) !== zone) return false
    if (filter === "essentials" && category && (item as Essential).category !== category) return false
    if (!search) return true
    const name = getName(item).toLowerCase()
    const sub = getSub(item).toLowerCase()
    return name.includes(search.toLowerCase()) || sub.includes(search.toLowerCase())
  })

  // Resultados del buscador flotante: por relevancia con lo escrito, y si tienes la ubicación
  // activada, los más cercanos primero (sin texto: los 5 más cercanos a ti).
  const mapQ = normQ(mapQuery)
  const mapDist = (item: Club | Event | Essential): number | null =>
    userLocation && item.latitude && item.longitude
      ? distanceInMeters(userLocation[1], userLocation[0], Number(item.latitude), Number(item.longitude))
      : null
  const mapResults = (() => {
    const base = (rawList as (Club | Event | Essential)[]).filter(
      (i) => i.latitude && i.longitude
        && (!zone || zoneOf(i as { neighborhood?: string | null; address?: string | null }) === zone)
        && (filter !== "essentials" || !category || (i as Essential).category === category)
    )
    if (!mapQ) {
      if (!userLocation) return []
      return base
        .map((i) => ({ i, d: mapDist(i) as number }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 5)
    }
    return base
      .map((i) => {
        const name = normQ(getName(i))
        const sub = normQ(getSub(i))
        let score = 0
        if (name === mapQ) score = 100
        else if (name.startsWith(mapQ)) score = 80
        else if (name.split(" ").some((w) => w.startsWith(mapQ))) score = 60
        else if (mapQ.length >= 3 && name.includes(mapQ)) score = 40
        else if (sub.split(" ").some((w) => w.startsWith(mapQ))) score = 20
        else if (mapQ.length >= 3 && sub.includes(mapQ)) score = 10
        return { i, score, d: mapDist(i) }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (a.d ?? Infinity) - (b.d ?? Infinity))
      .slice(0, 6)
  })()

  const pickFromMapSearch = (item: Club | Event | Essential) => {
    setSelected(item)
    setMapQuery("")
    setMapSearchOpen(false)
    setShowList(false)
    map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 })
  }

  if (isLoggedIn === null) {
    return (
      <main style={{ display: "flex", minHeight: "100dvh", flexDirection: "column", gap: "14px", alignItems: "center", justifyContent: "center", background: "#0a0910", color: "#fff" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "3px solid rgba(124,92,255,0.2)", borderTopColor: "#7c5cff", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)" }}>{t("common.loading")}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginWall titleKey="map.title" subtitleKey="map.subtitle" />
        <BottomNav />
      </>
    )
  }

  return (
    <div style={{ height: "100dvh", background: "#0a0910", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: `1px solid ${COLORS[filter]}33`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, background: "linear-gradient(180deg, rgba(10,6,16,0.92), rgba(0,0,0,0.75))", backdropFilter: "blur(16px)", gap: "8px", flexShrink: 0, minWidth: 0, transition: "border-color 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "6px", borderRadius: "999px", padding: "7px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", fontSize: "13px", fontWeight: 700, color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t("common.back")}
          </Link>
          <span className="hidden sm:inline" style={{ fontSize: "15px", fontWeight: 900, color: "#fff", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            {t("nav.map")} <span style={{ fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>· Barcelona</span>
          </span>
        </div>
        {/* Antes este grupo de botones (clubs/eventos/esenciales) no tenía forma de encoger ni
            de hacer scroll: en pantallas estrechas el bar de arriba se desbordaba y "esenciales"
            (el último botón) quedaba fuera de la pantalla, sin poder pulsarlo. Ahora hace scroll
            horizontal y el contenedor puede encogerse (minWidth:0) en vez de desbordar. */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", minWidth: 0 }}>
          {(["clubs", "events", "essentials"] as Filter[]).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setSearch("") }}
              style={{
                padding: "7px 13px", borderRadius: "999px",
                border: filter === f ? `1px solid ${COLORS[f]}` : "1px solid rgba(255,255,255,0.1)",
                background: filter === f ? `linear-gradient(135deg, ${COLORS[f]}33, ${COLORS[f]}11)` : "rgba(255,255,255,0.03)",
                boxShadow: filter === f ? `0 0 18px ${COLORS[f]}40` : "none",
                color: filter === f ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s ease",
              }}>
              <FilterIcon f={f} /> {t(`nav.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, minWidth: 0 }}>
      <aside className="hidden lg:flex" style={{ width: showList === false ? "0px" : "320px", borderRight: showList === false ? "none" : "1px solid rgba(255,255,255,0.1)", background: "#0a0910", flexDirection: "column", overflow: "hidden", flexShrink: 0, transition: "width 0.3s ease", minWidth: 0 }}>
          <div style={{ padding: "14px 14px 0" }}>
            <SearchInput value={search} onChange={setSearch} accent={COLORS[filter]} />
            {filterChips}
            <p style={{ marginTop: "10px", fontSize: "12px", color: "#a19fad" }}>
              {currentList.filter((i) => i.latitude && i.longitude).length} {t("map.results")}
            </p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(currentList as (Club | Event | Essential)[]).filter((item) => item.latitude && item.longitude).map((item) => {
                const isSelected = !!(selected && "id" in selected && selected.id === item.id)
                return (
                  <button key={item.id}
                    onClick={() => { setSelected(item); map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 }) }}
                    style={{ display: "flex", alignItems: "center", gap: "11px", textAlign: "left", borderRadius: "16px", border: isSelected ? `1px solid ${COLORS[filter]}88` : "1px solid rgba(255,255,255,0.08)", background: isSelected ? `linear-gradient(135deg, ${COLORS[filter]}22, ${COLORS[filter]}08)` : "rgba(255,255,255,0.03)", boxShadow: isSelected ? `0 0 14px ${COLORS[filter]}25` : "none", padding: "10px 13px", cursor: "pointer", width: "100%", transition: "all 0.2s" }}>
                    {renderAvatar(item, 38)}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getName(item)}</p>
                      <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getSub(item)}</p>
                    </div>
                  </button>
                )
              })}
              {currentList.filter(i => i.latitude && i.longitude).length === 0 && (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", padding: "16px", textAlign: "center" }}>{t("map.noResults")}</p>
              )}
            </div>
          </div>
        </aside>

        <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
          <div ref={mapContainer} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          {filter === "essentials" && (
            <div
              aria-label="Leyenda"
              style={{ position: "absolute", left: "12px", bottom: "96px", zIndex: 10, display: "flex", gap: "10px", padding: "7px 11px", borderRadius: "999px", background: "rgba(10,9,16,0.85)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", fontSize: "11px", fontWeight: 600, color: "#d4d4d8" }}
            >
              {([["open", t("map.legendOpen")], ["soon", t("map.legendSoon")], ["closed", t("map.legendClosed")]] as const).map(([k, label]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: STATUS_COLORS[k] }} />
                  {label}
                </span>
              ))}
            </div>
          )}
          <button className="lg:hidden" onClick={() => setShowList(!showList)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>{showList ? <X size={14} /> : <List size={14} />} {showList ? t("map.close") : t("map.list")}</span>
          </button>
          <button className="hidden lg:block" onClick={() => setShowList(showList === false ? true : false)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 10px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showList === false ? <List size={16} /> : <X size={16} />}
          </button>
          <button onClick={startTracking}
            style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, borderRadius: "999px", background: trackingActive ? "rgba(59,130,246,0.9)" : "rgba(0,0,0,0.75)", border: trackingActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.2)", padding: "9px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><LocateFixed size={14} /> {trackingActive ? t("map.following") : t("map.myLocation")}</span>
          </button>

          {/* Buscador flotante: escribe un nombre y salta directo a ese sitio; con tu ubicación
              activada ordena por cercanía y la ruta a pie se dibuja al seleccionarlo. */}
          <div ref={mapSearchRef} style={{ position: "absolute", top: "58px", left: "12px", right: "12px", maxWidth: "420px", zIndex: 15 }}>
            <div style={{ position: "relative" }}>
              <input
                value={mapQuery}
                onChange={(e) => { setMapQuery(e.target.value); setMapSearchOpen(true) }}
                onClick={() => setMapSearchOpen((o) => !o)}
                placeholder={t("map.searchPlaceholder").replace("{type}", t(`nav.${filter}`).toLowerCase())}
                aria-label={t("map.searchPlaceholder").replace("{type}", t(`nav.${filter}`).toLowerCase())}
                style={{ width: "100%", boxSizing: "border-box", borderRadius: "9999px", border: `1px solid ${COLORS[filter]}66`, background: "rgba(22,16,41,0.92)", color: "#fff", padding: "12px 44px 12px 18px", fontSize: "16px", outline: "none", backdropFilter: "blur(14px)", boxShadow: `0 10px 30px -12px ${COLORS[filter]}99` }}
              />
              {mapQuery ? (
                <button onClick={() => { setMapQuery(""); setMapSearchOpen(false) }} aria-label={t("explorer.clearSearch")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex" }}><X size={16} /></button>
              ) : (
                <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)", pointerEvents: "none", display: "flex" }}><Search size={16} /></span>
              )}
            </div>
            {mapSearchOpen && (
              <div style={{ marginTop: "8px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(13,10,28,0.97)", backdropFilter: "blur(16px)", overflow: "hidden", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.8)" }}>
                {!mapQ && !userLocation && (
                  <button onClick={startTracking} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 16px", background: "none", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><LocateFixed size={16} /> {t("map.useLocation")}</span>
                  </button>
                )}
                {!mapQ && userLocation && mapResults.length > 0 && (
                  <p style={{ padding: "10px 16px 4px", fontSize: "12px", fontWeight: 600, color: "#a19fad" }}>{t("essentialsPage.nearTitle")}</p>
                )}
                {mapQ && mapResults.length === 0 && (
                  <p style={{ padding: "14px 16px", fontSize: "13px", color: "#a19fad" }}>{t("map.noResultsFor").replace("{q}", mapQuery)}</p>
                )}
                {(mapResults as { i: Club | Event | Essential; d?: number | null }[]).map(({ i, d }) => {
                  const dist = typeof d === "number" ? d : mapDist(i)
                  return (
                    <button key={i.id} onClick={() => pickFromMapSearch(i)}
                      style={{ display: "flex", alignItems: "center", gap: "11px", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                      {renderAvatar(i, 34)}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getName(i)}</p>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getSub(i)}</p>
                      </div>
                      {dist !== null && <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS[filter], flexShrink: 0 }}>{formatDistance(dist)}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {showList && (
            <div className="lg:hidden" style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "85%", maxWidth: "320px", background: "#0a0910", zIndex: 20, overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <p style={{ fontWeight: 600, color: "#fff", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}><FilterIcon f={filter} /> {t(`nav.${filter}`)}</p>
                  <button onClick={() => setShowList(false)} aria-label={t("clubPage.close")} style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", display: "flex" }}><X size={16} /></button>
                </div>
                <div style={{ marginBottom: "10px" }}><SearchInput value={search} onChange={setSearch} accent={COLORS[filter]} />{filterChips}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(currentList as (Club | Event | Essential)[]).filter((item) => item.latitude && item.longitude).map((item) => (
                    <button key={item.id}
                      onClick={() => { setSelected(item); setShowList(false); map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 }) }}
                      style={{ display: "flex", alignItems: "center", gap: "11px", textAlign: "left", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "10px 13px", cursor: "pointer", width: "100%" }}>
                      {renderAvatar(item, 38)}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getName(item)}</p>
                        <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getSub(item)}</p>
                      </div>
                    </button>
                  ))}
                  {currentList.filter(i => i.latitude && i.longitude).length === 0 && (
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", padding: "16px", textAlign: "center" }}>{t("map.noResults")}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Antes esta ficha flotante no tenía ninguna clase responsive, así que se mostraba
              también en escritorio — a la vez que el panel de la izquierda (aside), que enseñaba
              lo mismo. Ahora en móvil/tablet sigue siendo esta ficha ancha pegada abajo; en
              escritorio la ficha vive flotando sobre el mapa, en la esquina inferior derecha, con
              el mismo tamaño compacto que antes tenía dentro de la barra lateral (justo debajo). */}
          {selected && (
            <div className="lg:hidden" style={{ position: "absolute", bottom: "80px", left: "16px", right: "16px", zIndex: 10, borderRadius: "26px", border: `1px solid ${COLORS[filter]}35`, background: "linear-gradient(180deg, rgba(15,12,20,0.97), rgba(0,0,0,0.96))", padding: "14px 16px 16px", backdropFilter: "blur(20px)", boxShadow: `0 24px 60px -20px rgba(0,0,0,0.7), 0 0 40px -12px ${COLORS[filter]}35` }}>
              <DetailCard
                item={selected}
                filter={filter}
                walkingTime={walkingTime}
                onClose={() => { setSelected(null); setWalkingTime(null) }}
                showHandle
                t={t}
              />
            </div>
          )}

          {selected && (
            <div className="hidden lg:block" style={{ position: "absolute", bottom: "20px", right: "20px", zIndex: 10, width: "300px", maxHeight: "calc(100% - 40px)", overflowY: "auto", borderRadius: "22px", border: `1px solid ${COLORS[filter]}35`, background: "linear-gradient(180deg, rgba(15,12,20,0.97), rgba(0,0,0,0.96))", padding: "14px 16px 16px", backdropFilter: "blur(20px)", boxShadow: `0 24px 60px -20px rgba(0,0,0,0.7), 0 0 40px -12px ${COLORS[filter]}35` }}>
              <DetailCard
                item={selected}
                filter={filter}
                walkingTime={walkingTime}
                onClose={() => { setSelected(null); setWalkingTime(null) }}
                t={t}
              />
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}