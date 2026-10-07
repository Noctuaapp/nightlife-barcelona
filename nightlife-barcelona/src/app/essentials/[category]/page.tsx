"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"
import ArrowIcon from "../../../components/ui/ArrowIcon"
import { distanceInMeters, formatDistance, walkingMinutes } from "../../../lib/geo"
import { getOpenStatus } from "../../../lib/openStatus"
import EssentialPhoto from "../../../components/essentials/EssentialPhoto"

const categoryConfig: Record<string, { icon: string; color: string; key: string }> = {
  pharmacy: { icon: "💊", color: "#10b981", key: "Pharmacy" },
  atm: { icon: "🏧", color: "#3b82f6", key: "ATM" },
  food: { icon: "🍔", color: "#f97316", key: "Food" },
  transport: { icon: "🚌", color: "#8b5cf6", key: "Transport" },
  metro: { icon: "🚇", color: "#dc2626", key: "Metro" },
  nitbus: { icon: "🌙", color: "#6366f1", key: "Nitbus" },
  taxi: { icon: "🚕", color: "#eab308", key: "Taxi" },
  supermarket: { icon: "🛒", color: "#ec4899", key: "Supermarket" },
  hotel: { icon: "🏨", color: "#14b8a6", key: "Hotel" },
  casino: { icon: "🎰", color: "#f43f5e", key: "Casino" },
  "gas-station": { icon: "⛽", color: "#f59e0b", key: "GasStation" },
  hospital: { icon: "🏥", color: "#ef4444", key: "Hospital" },
}

// Horario real del Metro de Barcelona (igual todos los días salvo el cierre):
// abre siempre a las 05:00, cierra a las 00:00 entre semana, 02:00 los sábados,
// y los domingos y festivos no cierra (24h). No tenemos calendario de festivos,
// así que festivos concretos no se detectan todavía.
function getMetroSchedule(): { label: string; isLate: boolean } {
  const day = new Date().getDay() // 0 = domingo, 6 = sábado
  if (day === 0) return { label: "🟢 Abierto 24h (domingo)", isLate: false }
  if (day === 6) return { label: "🟡 Abierto hasta las 02:00 · abre a las 05:00", isLate: true }
  return { label: "Abierto hasta las 00:00 · abre a las 05:00", isLate: false }
}

const TAXI_APPS = [
  { name: "FreeNow", url: "https://www.free-now.com/es/" },
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
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
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

function Reveal(props: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const revealRef = useReveal<HTMLDivElement>()
  const wrapperClass =
    "transition-all duration-700 ease-out motion-reduce:transition-none " +
    (revealRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6") +
    " " +
    (props.className || "")

  return (
    <div ref={revealRef.ref} style={props.style} className={wrapperClass}>
      {props.children}
    </div>
  )
}

export default function EssentialCategoryPage() {
  const params = useParams()
  const category = (params.category as string).toLowerCase()
  const knownConfig = categoryConfig[category]
  const config = knownConfig || { icon: "📍", color: "#a855f7", key: "Other" }
  const { t } = useLanguage()
  const label = knownConfig ? t("essentials.category_names." + config.key) : category

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [essentials, setEssentials] = useState<Essential[]>([])
  const [selected, setSelected] = useState<Essential | null>(null)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All")
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sortByDistance, setSortByDistance] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "map">("list")
  const [openOnly, setOpenOnly] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [farAway, setFarAway] = useState(false)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const pendingFitRef = useRef<[number, number][] | null>(null)
  const didInitialFit = useRef(false)

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
  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true)
      return
    }
    setLocating(true)
    setLocationDenied(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSortByDistance(true)
        setLocating(false)
      },
      () => {
        setLocationDenied(true)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  useEffect(() => {
    const fetchEssentials = async () => {
      // .eq("hidden", false) igual que en el listado — si no, un esencial oculto desde el admin
      // seguía siendo visitable por enlace directo.
      const { data } = await supabase.from("essentials").select("*").ilike("category", category).eq("hidden", false).order("name")
      if (data) setEssentials(data)
      setLoading(false)
    }
    fetchEssentials()
  }, [category])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.1734, 41.3851],
      zoom: 13,
    })

    map.current.on("load", () => {
      setMapReady(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // El mapa está oculto (display:none) en móvil cuando la vista es "list", así que
  // hace falta forzar un resize cuando se vuelve a mostrar o Mapbox lo pinta mal.
  useEffect(() => {
    if (mobileView === "map") {
      setTimeout(() => {
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

  // Al localizar al usuario: marcador morado y encuadre con los 5 más cercanos.
  useEffect(() => {
    if (!mapReady || !map.current || !userLocation) return
    userMarkerRef.current?.remove()
    userMarkerRef.current = new mapboxgl.Marker({ color: "#a855f7" }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map.current)

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

  useEffect(() => {
    if (!mapReady || !map.current || essentials.length === 0) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    essentials
      .filter((e) => e.latitude && e.longitude)
      .forEach((item) => {
        const marker = new mapboxgl.Marker({ color: config.color }).setLngLat([item.longitude!, item.latitude!]).addTo(map.current!)

        marker.getElement().addEventListener("click", () => {
          setSelected(item)
          map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 16, duration: 800 })
        })

        markersRef.current.push(marker)
      })
  }, [mapReady, essentials, config.color])

  const distMeters = (item: Essential): number | null =>
    userLocation && item.latitude && item.longitude
      ? distanceInMeters(userLocation.lat, userLocation.lng, Number(item.latitude), Number(item.longitude))
      : null

  const directionsFor = (item: Essential): string =>
    userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${item.latitude},${item.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`

  const distanceText = (d: number): string => formatDistance(d) + (d <= 2500 ? " · " + walkingMinutes(d) + " min andando" : "")

  const neighborhoods = ["All", ...Array.from(new Set(essentials.map((e) => e.neighborhood).filter(Boolean)))]

  const filteredEssentials = essentials
    .filter((e) => (selectedNeighborhood === "All" ? true : e.neighborhood === selectedNeighborhood))
    .filter((e) => !openOnly || getOpenStatus(e.open_hours).state === "open")
    .slice()
    .sort((a, b) => {
      if (!sortByDistance || !userLocation) return 0
      const da = distMeters(a) ?? Infinity
      const db = distMeters(b) ?? Infinity
      return da - db
    })

  const heroImage = essentials.find((e) => e.image)?.image || null

  const renderCard = (item: Essential, index: number) => {
    const hasCoords = Boolean(item.latitude && item.longitude)

    const dMeters = distMeters(item)
    const distanceLabel = dMeters != null ? distanceText(dMeters) : ""
    const directionsHref = hasCoords ? directionsFor(item) : ""

    const reportHref = "/contact?type=report_issue&subject=" + encodeURIComponent("Reporte: " + item.name)
    const isSelected = selected != null && selected.id === item.id

    const handleCardClick = () => {
      setSelected(item)
      setMobileView("map")
      if (hasCoords) {
        map.current?.flyTo({ center: [item.longitude as number, item.latitude as number], zoom: 16, duration: 800 })
      }
    }

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

    const status = getOpenStatus(item.open_hours)

    return (
      <Reveal key={item.id} style={{ transitionDelay: Math.min(index, 8) * 50 + "ms" }}>
        <div
          onClick={handleCardClick}
          className="group cursor-pointer overflow-hidden rounded-[22px] border backdrop-blur-xl transition duration-300 hover:-translate-y-0.5"
          style={{
            borderColor: isSelected ? config.color + "70" : "rgba(255,255,255,0.08)",
            background: isSelected ? config.color + "12" : "rgba(255,255,255,0.03)",
          }}
        >
          <div className="relative">
            <EssentialPhoto
              src={item.image}
              alt={item.name}
              icon={config.icon}
              color={config.color}
              className="h-40 w-full"
              imgClassName="transition duration-500 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {status.state !== "unknown" && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md ${
                    status.state === "open"
                      ? status.soon
                        ? "bg-amber-500/80 text-black"
                        : "bg-emerald-500/80 text-black"
                      : "bg-red-500/80 text-white"
                  }`}
                >
                  {status.label}
                </span>
              )}
              {distanceLabel && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">📍 {distanceLabel}</span>
              )}
            </div>
          </div>

          <div className="p-4">
            <h3 className="font-bold text-white">{item.name}</h3>
            {item.address && <p className="mt-0.5 text-xs text-zinc-400">{item.address}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {item.neighborhood && <span>📍 {item.neighborhood}</span>}
              {status.state === "unknown" && status.label && <span>🕒 {status.label}</span>}
            </div>
            {item.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{item.description}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hasCoords && (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={stopPropagation}
                  className="rounded-full bg-purple-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-400"
                >
                  🧭 Cómo llegar
                </a>
              )}
              {item.maps_link && (
                <a
                  href={item.maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={stopPropagation}
                  className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-black"
                >
                  Maps <ArrowIcon className="h-3 w-3" />
                </a>
              )}
              <a href={reportHref} onClick={stopPropagation} className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:text-white" title="Reportar un problema">
                ⚑
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    )
  }

  return (
    <>
      <Header />
      <main className="relative min-h-screen pb-40 text-white">
        {/* Hero */}
        <div className="relative h-[280px] w-full overflow-hidden md:h-[320px]">
          {heroImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,3,8,0.55) 0%, rgba(5,3,8,0.75) 60%, #050308 100%)" }} />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 20%, ${config.color}30, #050308 70%)` }} />
          )}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8">
            <Link href="/essentials" className="mb-4 w-fit text-sm text-zinc-300 transition hover:text-white">
              ← {t("essentials.title")}
            </Link>
            <div className="flex items-center gap-4">
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl backdrop-blur-xl"
                style={{ background: config.color + "30", border: "1px solid " + config.color + "55" }}
              >
                {config.icon}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-300">{t("essentials.title")}</p>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">{label}</h1>
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-300">
              {filteredEssentials.length} {filteredEssentials.length !== 1 ? t("essentials.locations_plural") : t("essentials.locations")}
            </p>
          </div>
        </div>

        {/* Panel de contexto: pedir taxi ya / horario del metro */}
        {category === "taxi" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="rounded-[24px] border border-yellow-500/25 bg-yellow-500/[0.06] p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-yellow-300">🚕 Pedir un taxi ahora</p>
              <div className="flex flex-wrap gap-2.5">
                {TAXI_APPS.map((app) => (
                  <a
                    key={app.name}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                  >
                    {app.name} <ArrowIcon className="h-3.5 w-3.5" />
                  </a>
                ))}
                {TAXI_PHONES.map((p) => (
                  <a
                    key={p.name}
                    href={`tel:${p.phone}`}
                    className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500 hover:text-black"
                  >
                    📞 {p.name}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">O usa las paradas de taxi reales de abajo si prefieres ir a coger uno directamente.</p>
            </div>
          </section>
        )}

        {category === "metro" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="rounded-[24px] border border-red-500/25 bg-red-500/[0.06] p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-red-300">🚇 Horario del Metro de Barcelona</p>
              <p className="text-lg font-black text-white">{getMetroSchedule().label}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Entre semana hasta las 00:00 · sábados hasta las 02:00 · domingos y festivos 24h · abre siempre a las 05:00.
              </p>
            </div>
          </section>
        )}

        {category === "nitbus" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="rounded-[24px] border border-indigo-500/25 bg-indigo-500/[0.06] p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-300">🌙 Nitbus · autobuses nocturnos</p>
              <p className="text-lg font-black text-white">Cada noche, aprox. 23:00 – 05:00</p>
              <p className="mt-1 text-xs text-zinc-500">
                17 líneas nocturnas cubren Barcelona cuando el metro está cerrado. Estas son las paradas/nudos principales
                donde confluyen varias líneas — consulta la app TMB o el panel de la parada para el horario exacto de cada línea.
              </p>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-3">
            {neighborhoods.length > 2 && (
              <div className="flex flex-1 gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {neighborhoods.map((n) => {
                  const isActive = selectedNeighborhood === n
                  return (
                    <button
                      key={n || "all"}
                      onClick={() => setSelectedNeighborhood(n || "All")}
                      className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition ${
                        isActive ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => (userLocation ? setSortByDistance(!sortByDistance) : locateMe())}
              disabled={locating}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                userLocation && sortByDistance ? "bg-purple-500 text-white" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              {locating ? "Localizando..." : userLocation ? "📍 Más cercano" : "📍 Cerca de mí"}
            </button>
            <button
              onClick={() => setOpenOnly(!openOnly)}
              aria-pressed={openOnly}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                openOnly ? "bg-emerald-500 text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              }`}
            >
              🟢 Abierto ahora
            </button>
          </div>

          {locationDenied && (
            <p className="mt-3 text-xs text-amber-300">
              No hemos podido acceder a tu ubicación. Activa el permiso de ubicación del navegador y vuelve a pulsar "Cerca de mí".
            </p>
          )}
          {farAway && (
            <p className="mt-3 text-xs text-zinc-400">Parece que estás lejos de Barcelona, así que mostramos la categoría completa.</p>
          )}

          {/* Toggle lista/mapa — solo móvil */}
          <div className="mt-3 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 md:hidden">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  mobileView === v ? "bg-white text-black" : "text-zinc-400"
                }`}
              >
                {v === "list" ? "☰ Lista" : "🗺️ Mapa"}
              </button>
            ))}
          </div>
        </section>

        {/* Content: lista + mapa lado a lado en escritorio */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-12">
            <div className={`md:col-span-5 ${mobileView === "map" ? "hidden md:block" : ""}`}>
              {loading ? (
                <div className="grid gap-3">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-[22px] bg-white/[0.03]" />)}
                </div>
              ) : filteredEssentials.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-lg font-bold text-zinc-300">No hay resultados con estos filtros</p>
                </div>
              ) : (
                <div className="grid gap-3 md:max-h-[640px] md:overflow-y-auto md:pr-1 [scrollbar-width:thin]">
                  {filteredEssentials.map((item, index) => renderCard(item, index))}
                </div>
              )}
            </div>

            <div className={`md:col-span-7 ${mobileView === "list" ? "hidden md:block" : ""}`}>
              <div className="relative overflow-hidden rounded-[28px] border md:sticky md:top-24" style={{ height: "640px", borderColor: config.color + "30" }}>
                <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

                {/* Ficha del sitio tocado: sin esto, en el móvil tocar un marcador no mostraba nada */}
                {selected && (
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-[#0b0912]/95 p-4 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{selected.name}</p>
                        {selected.address && <p className="truncate text-xs text-zinc-400">{selected.address}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          {selected.open_hours && <span>🕒 {selected.open_hours}</span>}
                          {(() => {
                            const d = distMeters(selected)
                            return d != null ? (
                              <span className="rounded-full bg-purple-400/10 px-2 py-0.5 font-semibold text-purple-300">{distanceText(d)}</span>
                            ) : null
                          })()}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                        aria-label="Cerrar"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selected.latitude && selected.longitude && (
                        <a
                          href={directionsFor(selected)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[11px] font-semibold text-purple-300 transition hover:bg-purple-500 hover:text-white"
                        >
                          🧭 Cómo llegar
                        </a>
                      )}
                      {selected.maps_link && (
                        <a
                          href={selected.maps_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white hover:text-black"
                        >
                          Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
