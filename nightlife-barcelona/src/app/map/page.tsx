"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/layout/BottomNav"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"

type Club = {
  id: number
  name: string
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

const COLORS: Record<Filter, string> = {
  clubs: "#a855f7",
  events: "#ec4899",
  essentials: "#10b981",
}

const FILTER_ICONS: Record<Filter, string> = {
  clubs: "🎪",
  events: "🎉",
  essentials: "📍",
}

const getTransportLinks = (name: string, address: string | null, lat: number | null, lng: number | null) => {
  const dest = encodeURIComponent(address || name)
  const uberLink = lat && lng
    ? `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}`
    : `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
  const cabifyLink = `https://cabify.com/es`
  const freeNowLink = `https://free-now.com`
  return { uberLink, cabifyLink, freeNowLink }
}

const TransportButtons = ({ name, address, lat, lng }: { name: string; address: string | null; lat: number | null; lng: number | null }) => {
  const { uberLink, cabifyLink, freeNowLink } = getTransportLinks(name, address, lat, lng)
  return (
    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
      <a href={uberLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "10px", background: "#000", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 4px", fontSize: "11px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
        🚗 Uber
      </a>
      <a href={cabifyLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "10px", background: "#7c3aed", border: "1px solid rgba(124,58,237,0.5)", padding: "8px 4px", fontSize: "11px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
        🟣 Cabify
      </a>
      <a href={freeNowLink} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "10px", background: "#ca8a04", border: "1px solid rgba(202,138,4,0.5)", padding: "8px 4px", fontSize: "11px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
        🚕 FREE NOW
      </a>
    </div>
  )
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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [trackingActive, setTrackingActive] = useState(false)
  const [walkingTime, setWalkingTime] = useState<string | null>(null)

  // Analítica de búsquedas: guarda lo que la gente busca en el mapa (con un pequeño debounce
  // para no insertar una fila por cada letra) para poder verlo luego en el admin.
  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) return
    const timeout = setTimeout(async () => {
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from("analytics").insert({
        event_type: "search",
        item_type: filter,
        item_name: query,
        user_id: userData.user?.id || null,
      })
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
    supabase.auth.getSession().then(({ data }) => {
      const logged = !!data.session
      setLoggedIn(logged)
      setIsLoggedIn(logged)
    })
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
        supabase.from("clubs").select("id, name, neighborhood, music, hours, price, latitude, longitude, address, image").eq("hidden", false),
        supabase.from("events").select("id, title, date, price, image, latitude, longitude, address").eq("hidden", false),
        supabase.from("essentials").select("id, name, category, neighborhood, open_hours, latitude, longitude, address").eq("hidden", false),
      ])
      if (clubsData) setClubs(clubsData)
      if (eventsData) setEvents(eventsData)
      if (essentialsData) setEssentials(essentialsData)
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

      const el = document.createElement("div")
      el.style.cssText = `width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.5); cursor: pointer; overflow: hidden; display: flex; align-items: center; justify-content: center; background: ${color}; font-size: 11px; font-weight: 800; color: #fff; font-family: inherit;`
      if (image) {
        const img = document.createElement("img")
        img.src = image
        img.alt = label || ""
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover;"
        el.appendChild(img)
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
    if (filter === "clubs") clubs.filter((c) => c.latitude && c.longitude).forEach((c) => addMarker(c.latitude!, c.longitude!, c))
    else if (filter === "events") events.filter((e) => e.latitude && e.longitude).forEach((e) => addMarker(e.latitude!, e.longitude!, e))
    else if (filter === "essentials") essentials.filter((e) => e.latitude && e.longitude).forEach((e) => addMarker(e.latitude!, e.longitude!, e))
  }, [filter, mapReady, clubs, events, essentials])

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
      } catch (e) { console.log("Route error:", e) }
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
      (err) => console.log("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    watchIdRef.current = id
    setTrackingActive(true)
  }

  const getName = (item: Club | Event | Essential) => "name" in item ? item.name : item.title
  const getSub = (item: Club | Event | Essential) => {
    if ("music" in item) return item.neighborhood || ""
    if ("title" in item && "date" in item) return (item as Event).date || ""
    if ("category" in item) return (item as Essential).category || ""
    return ""
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
  const currentList = rawList.filter((item) => {
    if (!search) return true
    const name = getName(item).toLowerCase()
    const sub = getSub(item).toLowerCase()
    return name.includes(search.toLowerCase()) || sub.includes(search.toLowerCase())
  })

  if (isLoggedIn === null) {
    return (
      <main style={{ display: "flex", minHeight: "100dvh", flexDirection: "column", gap: "14px", alignItems: "center", justifyContent: "center", background: "#050308", color: "#fff" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "3px solid rgba(168,85,247,0.2)", borderTopColor: "#a855f7", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)" }}>{t("common.loading")}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <BottomNav />
        <main style={{ position: "relative", display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", background: "#050308", color: "#fff", padding: "0 16px", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: "-160px", top: "-160px", width: "500px", height: "500px", borderRadius: "9999px", background: "rgba(168,85,247,0.2)", filter: "blur(120px)" }} />
            <div style={{ position: "absolute", right: "-160px", top: "30%", width: "450px", height: "450px", borderRadius: "9999px", background: "rgba(245,180,60,0.1)", filter: "blur(130px)" }} />
          </div>
          <div style={{ position: "relative", maxWidth: "420px", textAlign: "center" }}>
            <div style={{ width: "96px", height: "96px", margin: "0 auto 24px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(168,85,247,0.35), rgba(236,72,153,0.15))", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "44px", boxShadow: "0 0 40px -10px rgba(168,85,247,0.5)" }}>
              🗺️
            </div>
            <h1 style={{ fontSize: "38px", fontWeight: 900, color: "#fff" }}>{t("map.title")}</h1>
            <p style={{ marginTop: "16px", color: "rgba(255,255,255,0.5)", fontSize: "17px", lineHeight: 1.6 }}>
              {t("map.subtitle")}
            </p>
            <div style={{ marginTop: "32px", display: "flex", gap: "16px", justifyContent: "center" }}>
              <Link href="/signup" style={{ borderRadius: "9999px", background: "#fff", padding: "16px 32px", fontWeight: 700, color: "#000", textDecoration: "none" }}>{t("nav.signup")}</Link>
              <Link href="/login" style={{ borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", padding: "16px 32px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>{t("nav.login")}</Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <div style={{ height: "100dvh", background: "#050308", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: `1px solid ${COLORS[filter]}33`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, background: "linear-gradient(180deg, rgba(10,6,16,0.92), rgba(0,0,0,0.75))", backdropFilter: "blur(16px)", gap: "8px", flexShrink: 0, minWidth: 0, transition: "border-color 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "6px", borderRadius: "999px", padding: "7px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", fontSize: "13px", fontWeight: 700, color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t("common.back")}
          </Link>
          <span className="hidden sm:inline" style={{ fontSize: "15px", fontWeight: 900, color: "#fff", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            🗺️ {t("nav.map")} <span style={{ fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>· Barcelona</span>
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
                fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s ease",
              }}>
              {FILTER_ICONS[f]} {t(`nav.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, minWidth: 0 }}>
      <aside className="hidden lg:flex" style={{ width: showList === false ? "0px" : "320px", borderRight: showList === false ? "none" : "1px solid rgba(255,255,255,0.1)", background: "#050308", flexDirection: "column", overflow: "hidden", flexShrink: 0, transition: "width 0.3s ease", minWidth: 0 }}>
          <div style={{ padding: "14px 14px 0" }}>
            <SearchInput value={search} onChange={setSearch} accent={COLORS[filter]} />
            <p style={{ marginTop: "10px", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
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
          {selected && (
            <div style={{ borderTop: `1px solid ${COLORS[filter]}30`, padding: "16px", background: `linear-gradient(180deg, ${COLORS[filter]}12, rgba(255,255,255,0.02))`, flexShrink: 0 }}>
              {getImage(selected) ? (
                <img src={getImage(selected)!} alt={getName(selected)} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px", border: `1px solid ${COLORS[filter]}30` }} />
              ) : (
                <div style={{ width: "100%", height: "120px", borderRadius: "12px", marginBottom: "12px", background: `linear-gradient(135deg, ${COLORS[filter]}55, ${COLORS[filter]}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>
                  {FILTER_ICONS[filter]}
                </div>
              )}
              <p style={{ fontWeight: 900, fontSize: "16px", color: "#fff" }}>{getName(selected)}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{getSub(selected)}</p>
              {"address" in selected && selected.address && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>📍 {selected.address}</p>}
              {walkingTime && <p style={{ fontSize: "12px", color: "#3b82f6", marginTop: "6px", fontWeight: 700 }}>🚶 {walkingTime}</p>}
              <TransportButtons name={getName(selected)} address={"address" in selected ? selected.address : null} lat={selected.latitude} lng={selected.longitude} />
              {filter === "clubs" && <Link href={`/clubs/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>{t("map.viewClub")}</Link>}
              {filter === "events" && <Link href={`/event/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>{t("map.viewEvent")}</Link>}
            </div>
          )}
        </aside>

        <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
          <div ref={mapContainer} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <button className="lg:hidden" onClick={() => setShowList(!showList)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            {showList ? `✕ ${t("map.close")}` : `☰ ${t("map.list")}`}
          </button>
          <button className="hidden lg:block" onClick={() => setShowList(showList === false ? true : false)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 10px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showList === false ? "☰" : "✕"}
          </button>
          <button onClick={startTracking}
            style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, borderRadius: "999px", background: trackingActive ? "rgba(59,130,246,0.9)" : "rgba(0,0,0,0.75)", border: trackingActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.2)", padding: "9px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            {trackingActive ? `📍 ${t("map.following")}` : `📍 ${t("map.myLocation")}`}
          </button>

          {showList && (
            <div className="lg:hidden" style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "85%", maxWidth: "320px", background: "#050308", zIndex: 20, overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px", textTransform: "capitalize" }}>{FILTER_ICONS[filter]} {t(`nav.${filter}`)}</p>
                  <button onClick={() => setShowList(false)} style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ marginBottom: "10px" }}><SearchInput value={search} onChange={setSearch} accent={COLORS[filter]} /></div>
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

          {selected && (
            <div style={{ position: "absolute", bottom: "80px", left: "16px", right: "16px", zIndex: 10, borderRadius: "20px", border: `1px solid ${COLORS[filter]}40`, background: "rgba(0,0,0,0.92)", padding: "16px", backdropFilter: "blur(16px)", boxShadow: `0 20px 50px -20px rgba(0,0,0,0.6), 0 0 30px -10px ${COLORS[filter]}30` }}>
              {getImage(selected) ? (
                <img src={getImage(selected)!} alt={getName(selected)} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px", border: `1px solid ${COLORS[filter]}30` }} />
              ) : (
                <div style={{ width: "100%", height: "120px", borderRadius: "12px", marginBottom: "12px", background: `linear-gradient(135deg, ${COLORS[filter]}55, ${COLORS[filter]}15)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>
                  {FILTER_ICONS[filter]}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 900, color: "#fff", fontSize: "15px" }}>{getName(selected)}</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{getSub(selected)}</p>
                  {walkingTime && <p style={{ fontSize: "12px", color: "#3b82f6", marginTop: "4px", fontWeight: 700 }}>🚶 {walkingTime}</p>}
                </div>
                <button onClick={() => { setSelected(null); setWalkingTime(null) }} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", padding: "0 0 0 8px" }}>✕</button>
              </div>
              <TransportButtons name={getName(selected)} address={"address" in selected ? selected.address : null} lat={selected.latitude} lng={selected.longitude} />
              {filter === "clubs" && <Link href={`/clubs/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>{t("map.viewClub")}</Link>}
              {filter === "events" && <Link href={`/event/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>{t("map.viewEvent")}</Link>}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}