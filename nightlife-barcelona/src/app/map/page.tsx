"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "../../lib/supabase"
import BottomNav from "../../components/layout/BottomNav"

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

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

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

const SearchInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div style={{ position: "relative" }}>
    <input
      type="text"
      placeholder="Buscar..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px",
        padding: "11px 36px 11px 14px", fontSize: "13px", color: "#fff",
        outline: "none", boxSizing: "border-box",
      }}
    />
    <svg style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
)

export default function MapPage() {
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
    const addMarker = (lat: number, lng: number, item: Club | Event | Essential) => {
      const marker = new mapboxgl.Marker({ color }).setLngLat([lng, lat]).addTo(map.current!)
      marker.getElement().addEventListener("click", () => {
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
        setWalkingTime(`${Math.ceil(route.duration / 60)} min andando`)
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

  const rawList = filter === "clubs" ? clubs : filter === "events" ? events : essentials
  const currentList = rawList.filter((item) => {
    if (!search) return true
    const name = getName(item).toLowerCase()
    const sub = getSub(item).toLowerCase()
    return name.includes(search.toLowerCase()) || sub.includes(search.toLowerCase())
  })

  if (isLoggedIn === null) {
    return (
      <main style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", background: "#050308", color: "#fff" }}>
        <p style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)" }}>Cargando...</p>
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
            <div style={{ fontSize: "64px", marginBottom: "24px" }}>🗺️</div>
            <h1 style={{ fontSize: "38px", fontWeight: 900, color: "#fff" }}>Explora Barcelona</h1>
            <p style={{ marginTop: "16px", color: "rgba(255,255,255,0.5)", fontSize: "17px", lineHeight: 1.6 }}>
              Crea una cuenta gratis para explorar el mapa interactivo de la vida nocturna de Barcelona.
            </p>
            <div style={{ marginTop: "32px", display: "flex", gap: "16px", justifyContent: "center" }}>
              <Link href="/signup" style={{ borderRadius: "9999px", background: "#fff", padding: "16px 32px", fontWeight: 700, color: "#000", textDecoration: "none" }}>Crear cuenta</Link>
              <Link href="/login" style={{ borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", padding: "16px 32px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>Iniciar sesión</Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <div style={{ height: "100dvh", background: "#050308", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "6px", borderRadius: "999px", padding: "7px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", fontSize: "13px", fontWeight: 700, color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Volver
          </Link>
          <span style={{ fontSize: "15px", fontWeight: 900, color: "#fff", whiteSpace: "nowrap" }}>Barcelona</span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
          {(["clubs", "events", "essentials"] as Filter[]).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setSearch("") }}
              style={{ padding: "6px 12px", borderRadius: "999px", border: filter === f ? `1px solid ${COLORS[f]}` : "1px solid rgba(255,255,255,0.1)", background: filter === f ? `${COLORS[f]}22` : "rgba(255,255,255,0.03)", color: filter === f ? COLORS[f] : "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap" }}>
              {FILTER_ICONS[f]} {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, minWidth: 0 }}>
      <aside className="hidden lg:flex" style={{ width: showList === false ? "0px" : "320px", borderRight: showList === false ? "none" : "1px solid rgba(255,255,255,0.1)", background: "#050308", flexDirection: "column", overflow: "hidden", flexShrink: 0, transition: "width 0.3s ease", minWidth: 0 }}>
          <div style={{ padding: "14px 14px 0" }}>
            <SearchInput value={search} onChange={setSearch} />
            <p style={{ marginTop: "10px", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              {currentList.filter((i) => i.latitude && i.longitude).length} resultados
            </p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(currentList as (Club | Event | Essential)[]).filter((item) => item.latitude && item.longitude).map((item) => (
                <button key={item.id}
                  onClick={() => { setSelected(item); map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 }) }}
                  style={{ textAlign: "left", borderRadius: "16px", border: selected && "id" in selected && selected.id === item.id ? `1px solid ${COLORS[filter]}88` : "1px solid rgba(255,255,255,0.08)", background: selected && "id" in selected && selected.id === item.id ? `${COLORS[filter]}18` : "rgba(255,255,255,0.03)", padding: "13px", cursor: "pointer", width: "100%", transition: "background 0.2s" }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>{getName(item)}</p>
                  <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{getSub(item)}</p>
                </button>
              ))}
              {currentList.filter(i => i.latitude && i.longitude).length === 0 && (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", padding: "16px", textAlign: "center" }}>No se encontraron resultados.</p>
              )}
            </div>
          </div>
          {selected && (
            <div style={{ borderTop: `1px solid ${COLORS[filter]}30`, padding: "16px", background: `linear-gradient(180deg, ${COLORS[filter]}10, rgba(255,255,255,0.02))`, flexShrink: 0 }}>
              {getImage(selected) && <img src={getImage(selected)!} alt={getName(selected)} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px" }} />}
              <p style={{ fontWeight: 900, fontSize: "16px", color: "#fff" }}>{getName(selected)}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{getSub(selected)}</p>
              {"address" in selected && selected.address && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>📍 {selected.address}</p>}
              {walkingTime && <p style={{ fontSize: "12px", color: "#3b82f6", marginTop: "6px", fontWeight: 700 }}>🚶 {walkingTime}</p>}
              <TransportButtons name={getName(selected)} address={"address" in selected ? selected.address : null} lat={selected.latitude} lng={selected.longitude} />
              {filter === "clubs" && <Link href={`/clubs/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>Ver club →</Link>}
              {filter === "events" && <Link href={`/event/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>Ver evento →</Link>}
            </div>
          )}
        </aside>

        <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
          <div ref={mapContainer} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <button className="lg:hidden" onClick={() => setShowList(!showList)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            {showList ? "✕ Cerrar" : "☰ Lista"}
          </button>
          <button className="hidden lg:block" onClick={() => setShowList(showList === false ? true : false)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", padding: "6px 10px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showList === false ? "☰" : "✕"}
          </button>
          <button onClick={startTracking}
            style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, borderRadius: "999px", background: trackingActive ? "rgba(59,130,246,0.9)" : "rgba(0,0,0,0.75)", border: trackingActive ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.2)", padding: "9px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(12px)" }}>
            {trackingActive ? "📍 Siguiendo" : "📍 Mi ubicación"}
          </button>

          {showList && (
            <div className="lg:hidden" style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "85%", maxWidth: "320px", background: "#050308", zIndex: 20, overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px", textTransform: "capitalize" }}>{FILTER_ICONS[filter]} {filter}</p>
                  <button onClick={() => setShowList(false)} style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ marginBottom: "10px" }}><SearchInput value={search} onChange={setSearch} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(currentList as (Club | Event | Essential)[]).filter((item) => item.latitude && item.longitude).map((item) => (
                    <button key={item.id}
                      onClick={() => { setSelected(item); setShowList(false); map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 }) }}
                      style={{ textAlign: "left", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "13px", cursor: "pointer", width: "100%" }}>
                      <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>{getName(item)}</p>
                      <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{getSub(item)}</p>
                    </button>
                  ))}
                  {currentList.filter(i => i.latitude && i.longitude).length === 0 && (
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", padding: "16px", textAlign: "center" }}>No se encontraron resultados.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selected && (
            <div style={{ position: "absolute", bottom: "80px", left: "16px", right: "16px", zIndex: 10, borderRadius: "20px", border: `1px solid ${COLORS[filter]}40`, background: "rgba(0,0,0,0.92)", padding: "16px", backdropFilter: "blur(16px)", boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6)" }}>
              {getImage(selected) && <img src={getImage(selected)!} alt={getName(selected)} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px" }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 900, color: "#fff", fontSize: "15px" }}>{getName(selected)}</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{getSub(selected)}</p>
                  {walkingTime && <p style={{ fontSize: "12px", color: "#3b82f6", marginTop: "4px", fontWeight: 700 }}>🚶 {walkingTime}</p>}
                </div>
                <button onClick={() => { setSelected(null); setWalkingTime(null) }} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", padding: "0 0 0 8px" }}>✕</button>
              </div>
              <TransportButtons name={getName(selected)} address={"address" in selected ? selected.address : null} lat={selected.latitude} lng={selected.longitude} />
              {filter === "clubs" && <Link href={`/clubs/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>Ver club →</Link>}
              {filter === "events" && <Link href={`/event/${createSlug(getName(selected))}`} style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>Ver evento →</Link>}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}