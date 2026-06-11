"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Link from "next/link"
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

const getTransportLinks = (name: string, address: string | null, lat: number | null, lng: number | null) => {
  const dest = encodeURIComponent(address || name)
  const uberLink = lat && lng
    ? `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}`
    : `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
  const cabifyLink = `https://cabify.com/ride?dest[0][name]=${encodeURIComponent(name)}&dest[0][address]=${dest}`
  const taxiLink = `https://www.taxi.barcelona/en`
  return { uberLink, cabifyLink, taxiLink }
}

const TransportButtons = ({ name, address, lat, lng }: { name: string; address: string | null; lat: number | null; lng: number | null }) => {
  const { uberLink, cabifyLink, taxiLink } = getTransportLinks(name, address, lat, lng)
  return (
    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
      <a href={uberLink} target="_blank" rel="noopener noreferrer"
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "8px", background: "#000", border: "1px solid rgba(255,255,255,0.2)", padding: "7px 4px", fontSize: "11px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
        🚗 Uber
      </a>
      <a href={cabifyLink} target="_blank" rel="noopener noreferrer"
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "8px", background: "#7c3aed", border: "1px solid rgba(124,58,237,0.5)", padding: "7px 4px", fontSize: "11px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
        🟣 Cabify
      </a>
      <a href={taxiLink} target="_blank" rel="noopener noreferrer"
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "8px", background: "#ca8a04", border: "1px solid rgba(202,138,4,0.5)", padding: "7px 4px", fontSize: "11px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
        🚕 Taxi
      </a>
    </div>
  )
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [filter, setFilter] = useState<Filter>("clubs")
  const [selected, setSelected] = useState<Club | Event | Essential | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [showList, setShowList] = useState(false)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

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
          if (map.current) {
            map.current.resize()
            setMapReady(true)
          }
        })

        const handleResize = () => {
          if (map.current) map.current.resize()
        }
        window.addEventListener("resize", handleResize)
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [loggedIn])

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: clubsData }, { data: eventsData }, { data: essentialsData }] =
        await Promise.all([
          supabase.from("clubs").select("id, name, neighborhood, music, hours, price, latitude, longitude, address"),
          supabase.from("events").select("id, title, date, price, image, latitude, longitude, address"),
          supabase.from("essentials").select("id, name, category, neighborhood, open_hours, latitude, longitude, address"),
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

    const color = COLORS[filter]

    const addMarker = (lat: number, lng: number, item: Club | Event | Essential) => {
      const marker = new mapboxgl.Marker({ color })
        .setLngLat([lng, lat])
        .addTo(map.current!)
      marker.getElement().addEventListener("click", () => {
        setSelected(item)
        map.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 })
      })
      markersRef.current.push(marker)
    }

    if (filter === "clubs") {
      clubs.filter((c) => c.latitude && c.longitude).forEach((c) => addMarker(c.latitude!, c.longitude!, c))
    } else if (filter === "events") {
      events.filter((e) => e.latitude && e.longitude).forEach((e) => addMarker(e.latitude!, e.longitude!, e))
    } else if (filter === "essentials") {
      essentials.filter((e) => e.latitude && e.longitude).forEach((e) => addMarker(e.latitude!, e.longitude!, e))
    }
  }, [filter, mapReady, clubs, events, essentials])

  const currentList = filter === "clubs" ? clubs : filter === "events" ? events : essentials

  const getName = (item: Club | Event | Essential) =>
    "name" in item ? item.name : item.title

  const getSub = (item: Club | Event | Essential) => {
    if ("music" in item) return item.neighborhood || ""
    if ("title" in item && "date" in item) return (item as Event).date || ""
    if ("category" in item) return (item as Essential).category || ""
    return ""
  }

  if (isLoggedIn === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading...</p>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <BottomNav />
        <main className="flex min-h-screen items-center justify-center bg-black text-white px-4">
          <div className="max-w-md text-center">
            <div className="text-7xl mb-6">🗺️</div>
            <h1 className="text-4xl font-black text-white">Explore Barcelona</h1>
            <p className="mt-4 text-zinc-400 text-lg leading-relaxed">
              Create a free account to explore the interactive nightlife map of Barcelona.
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <Link href="/signup" className="rounded-full bg-white px-8 py-4 font-bold text-black hover:scale-105 transition">
                Create account
              </Link>
              <Link href="/login" className="rounded-full border border-white/10 bg-white/5 px-8 py-4 font-bold text-white hover:bg-white/10 transition">
                Log in
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <div style={{ height: "100dvh", background: "#000", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, background: "#000", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap" }}>← Back</Link>
          <span style={{ fontSize: "15px", fontWeight: 900, color: "#fff", whiteSpace: "nowrap" }}>Barcelona</span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
          {(["clubs", "events", "essentials"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 10px", borderRadius: "999px",
                border: filter === f ? `1px solid ${COLORS[f]}` : "1px solid rgba(255,255,255,0.1)",
                background: filter === f ? `${COLORS[f]}22` : "rgba(255,255,255,0.03)",
                color: filter === f ? COLORS[f] : "rgba(255,255,255,0.5)",
                fontSize: "11px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, minWidth: 0 }}>

        <aside className="hidden lg:flex" style={{ width: "320px", borderRight: "1px solid rgba(255,255,255,0.1)", background: "#000", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(currentList as (Club | Event | Essential)[])
                .filter((item) => item.latitude && item.longitude)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelected(item)
                      map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 })
                    }}
                    style={{
                      textAlign: "left", borderRadius: "14px",
                      border: selected && "id" in selected && selected.id === item.id ? `1px solid ${COLORS[filter]}88` : "1px solid rgba(255,255,255,0.08)",
                      background: selected && "id" in selected && selected.id === item.id ? `${COLORS[filter]}18` : "rgba(255,255,255,0.02)",
                      padding: "12px", cursor: "pointer", width: "100%",
                    }}
                  >
                    <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>{getName(item)}</p>
                    <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{getSub(item)}</p>
                  </button>
                ))}
            </div>
          </div>

          {selected && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px", background: "rgba(255,255,255,0.02)", flexShrink: 0 }}>
              <p style={{ fontWeight: 900, fontSize: "16px", color: "#fff" }}>{getName(selected)}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{getSub(selected)}</p>
              {"address" in selected && selected.address && (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>📍 {selected.address}</p>
              )}
              <TransportButtons name={getName(selected)} address={"address" in selected ? selected.address : null} lat={selected.latitude} lng={selected.longitude} />
              {filter === "clubs" && (
                <Link href={`/clubs/${createSlug(getName(selected))}`}
                  style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>
                  View club →
                </Link>
              )}
              {filter === "events" && (
                <Link href={`/event/${createSlug(getName(selected))}`}
                  style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>
                  View event →
                </Link>
              )}
            </div>
          )}
        </aside>

        <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
          <div ref={mapContainer} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />

          <button
            className="lg:hidden"
            onClick={() => setShowList(!showList)}
            style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, borderRadius: "999px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 16px", fontSize: "13px", fontWeight: 700, color: "#fff", cursor: "pointer", backdropFilter: "blur(10px)" }}
          >
            {showList ? "✕ Close" : "☰ List"}
          </button>

          {showList && (
            <div
              className="lg:hidden"
              style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "85%", maxWidth: "320px", background: "#000", zIndex: 20, overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div style={{ padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px", textTransform: "capitalize" }}>{filter}</p>
                  <button
                    onClick={() => setShowList(false)}
                    style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(currentList as (Club | Event | Essential)[])
                    .filter((item) => item.latitude && item.longitude)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelected(item)
                          setShowList(false)
                          map.current?.flyTo({ center: [item.longitude!, item.latitude!], zoom: 15, duration: 800 })
                        }}
                        style={{
                          textAlign: "left", borderRadius: "14px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.02)",
                          padding: "12px", cursor: "pointer", width: "100%",
                        }}
                      >
                        <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>{getName(item)}</p>
                        <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{getSub(item)}</p>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {selected && (
            <div style={{ position: "absolute", bottom: "80px", left: "16px", right: "16px", zIndex: 10, borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.92)", padding: "16px", backdropFilter: "blur(10px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 900, color: "#fff", fontSize: "15px" }}>{getName(selected)}</p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{getSub(selected)}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", padding: "0 0 0 8px" }}>✕</button>
              </div>
              <TransportButtons name={getName(selected)} address={"address" in selected ? selected.address : null} lat={selected.latitude} lng={selected.longitude} />
              {filter === "clubs" && (
                <Link href={`/clubs/${createSlug(getName(selected))}`}
                  style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>
                  View club →
                </Link>
              )}
              {filter === "events" && (
                <Link href={`/event/${createSlug(getName(selected))}`}
                  style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}>
                  View event →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}