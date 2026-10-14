"use client"

import { zoneOf, zonesPresent } from "../../../lib/zones"
import { getMetroTonight } from "../../../lib/transitHours"
import { cleanEssential } from "../../../lib/essentials"
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
import AdminEditButton from "../../../components/admin/AdminEditButton"
import EssentialPhoto from "../../../components/essentials/EssentialPhoto"
import Icon from "../../../components/ui/Icon"
import { ESSENTIAL_CATEGORIES, categoryNameKey } from "../../../lib/essentialCategories"
import { MapPin } from "lucide-react"

// Un solo color (el de la marca) para todas las categorías; antes eran doce colores y emojis.
const BRAND = "#7c5cff"

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
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All")
  const [selectedZone, setSelectedZone] = useState("All")
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
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement>(null)
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
      if (data) setEssentials(data.map(cleanEssential))
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

    // Sin rotación/inclinación: en el móvil se activaban sin querer al arrastrar con dos dedos.
    map.current.dragRotate.disable()
    map.current.touchZoomRotate.disableRotation()

    // En pantallas táctiles el mapa se comía el gesto de un dedo y no se podía desplazar la
    // página. Ahora: un dedo desplaza la página; dos dedos mueven/hacen zoom en el mapa (se
    // activa el arrastre solo mientras haya dos dedos). Con ratón no cambia nada.
    const mapEl = mapContainer.current
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    let hintTimer: ReturnType<typeof setTimeout> | undefined
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        map.current?.dragPan.enable()
        if (e.cancelable) e.preventDefault()
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault()
        return
      }
      setMapHint(true)
      if (hintTimer) clearTimeout(hintTimer)
      hintTimer = setTimeout(() => setMapHint(false), 1200)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) map.current?.dragPan.disable()
    }
    if (isTouch) {
      map.current.dragPan.disable()
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

  useEffect(() => {
    if (!mapReady || !map.current || essentials.length === 0) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    essentials
      .filter((e) => e.latitude && e.longitude)
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
  }, [mapReady, essentials, config.color])

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
  const neighborhoods = [
    "All",
    ...Array.from(
      new Set(essentials.filter((e) => selectedZone === "All" || zoneOf(e) === selectedZone).map((e) => e.neighborhood).filter(Boolean))
    ),
  ]

  const filteredEssentials = essentials
    .filter((e) => (selectedZone === "All" ? true : zoneOf(e) === selectedZone))
    .filter((e) => (selectedNeighborhood === "All" ? true : e.neighborhood === selectedNeighborhood))
    .filter((e) => !openOnly || getOpenStatus(e.open_hours).state === "open")
    .slice()
    .sort((a, b) => {
      if (!sortByDistance || !userLocation) return 0
      const da = distMeters(a) ?? Infinity
      const db = distMeters(b) ?? Infinity
      return da - db
    })

  const renderCard = (item: Essential) => {
    const hasCoords = Boolean(item.latitude && item.longitude)

    const dMeters = distMeters(item)
    const distanceLabel = dMeters != null ? distanceText(dMeters) : ""
    const directionsHref = hasCoords ? directionsFor(item) : ""

    const reportHref = "/contact?type=report_issue&subject=" + encodeURIComponent(`${t("essentialsPage.reportPrefix")} ${item.name}`)
    const isSelected = selected != null && selected.id === item.id

    const handleCardClick = () => {
      setSelected(item)
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
        <EssentialPhoto src={item.image} alt={item.name} icon={<CatIcon size={24} />} color={config.color} className="h-16 w-16 shrink-0 rounded-ctl" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-ink">{item.name}</h3>
          {item.highFee && <span className="mt-1 inline-block rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">{t("essentialsPage.highFee")}</span>}
          <p className="mt-0.5 truncate text-sm text-zinc-400">{[item.neighborhood, item.address].filter(Boolean).join(" · ")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
            {status.label && <span className={status.state === "open" ? (status.soon ? "text-warn" : "text-open") : "text-zinc-400"}>{status.label}</span>}
            {distanceLabel && <span className="text-brand-soft">{distanceLabel}</span>}
          </div>
          {item.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{item.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasCoords && (
              <a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={stopPropagation} className="flex items-center gap-1.5 rounded-ctl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-strong">
                <Icon name="map" className="h-3.5 w-3.5" /> {t("clubPage.directions")}
              </a>
            )}
            {item.maps_link && (
              <a href={item.maps_link} target="_blank" rel="noopener noreferrer" onClick={stopPropagation} className="flex items-center gap-1 rounded-ctl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/5">
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
                {loading
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
              <p className="mt-3 text-xs text-zinc-400">{t("essentialsPage.taxiRanksHint")}</p>
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

        {category === "nitbus" && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            <div className="rounded-card border border-white/10 bg-surface p-5">
              <p className="mb-2 text-sm font-semibold text-zinc-300">{t("essentialsPage.nitbusTitle")}</p>
              <p className="text-lg font-semibold text-ink">{t("essentialsPage.nitbusLine")}</p>
              <p className="mt-1 text-xs text-zinc-400">{t("essentialsPage.nitbusBody")}</p>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-3">
            {availableZones.length > 1 && (
              <div className="flex w-full gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {["All", ...availableZones].map((z) => (
                  <button
                    key={z}
                    onClick={() => {
                      setSelectedZone(z)
                      setSelectedNeighborhood("All")
                    }}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedZone === z ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    {z === "All" ? t("essentialsPage.allArea") : z}
                  </button>
                ))}
              </div>
            )}
            {neighborhoods.length > 2 && (
              <div className="flex w-full gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {neighborhoods.map((n) => {
                  const isActive = selectedNeighborhood === n
                  return (
                    <button
                      key={n || "all"}
                      onClick={() => setSelectedNeighborhood(n || "All")}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive ? "bg-white text-night" : "border border-white/10 text-zinc-200 hover:bg-white/5"
                      }`}
                    >
                      {n === "All" ? t("essentialsPage.allBarrios") : n}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => (userLocation ? setSortByDistance(!sortByDistance) : locateMe())}
              disabled={locating}
              className={`flex-1 shrink-0 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition sm:flex-none ${
                userLocation && sortByDistance ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
              }`}
            >
              {locating ? t("explorer.locating") : userLocation ? t("explorer.sortDistance") : t("explorer.near")}
            </button>
            <button
              onClick={() => setOpenOnly(!openOnly)}
              aria-pressed={openOnly}
              className={`flex-1 shrink-0 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition sm:flex-none ${
                openOnly ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"
              }`}
            >
              {t("explorer.now")}
            </button>
          </div>

          {locationDenied && (
            <p className="mt-3 text-sm text-warn">{t("geo.denied")}</p>
          )}
          {farAway && (
            <p className="mt-3 text-sm text-zinc-400">{t("essentialsPage.farAway")}</p>
          )}

          {/* Toggle lista/mapa — solo móvil */}
          <div className="mt-3 flex gap-1 rounded-full border border-white/10 bg-surface p-1 md:hidden">
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

        {/* Content: lista + mapa lado a lado en escritorio */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-12">
            <div className={`md:col-span-5 ${mobileView === "map" ? "hidden md:block" : ""}`}>
              {loading ? (
                <div className="grid gap-3">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-card bg-surface" />)}
                </div>
              ) : filteredEssentials.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-lg font-semibold text-zinc-200">{t("essentialsPage.noFilterResults")}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:max-h-[640px] md:overflow-y-auto md:pr-1 [scrollbar-width:thin]">
                  {filteredEssentials.map((item) => renderCard(item))}
                </div>
              )}
            </div>

            <div className={`md:col-span-7 ${mobileView === "list" ? "hidden md:block" : ""}`}>
              <div
                ref={mapWrapperRef}
                className="relative h-[65dvh] min-h-[380px] scroll-mt-20 overflow-hidden rounded-card border border-white/10 md:sticky md:top-24 md:h-[640px]"
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
                      <div className="flex flex-wrap items-center gap-2 text-xs">
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
                            className="flex items-center gap-1.5 rounded-ctl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-strong"
                          >
                            <Icon name="map" className="h-3.5 w-3.5" /> {t("clubPage.directions")}
                          </a>
                        )}
                        <AdminEditButton kind="essential" id={selected.id} inline />
                        {selected.maps_link && (
                          <a
                            href={selected.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
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
          </div>
        </section>
      </main>
      {/* Acceso rápido al mapa mientras se mira la lista (solo móvil) */}
      {mobileView === "list" && !loading && essentials.length > 0 && (
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
