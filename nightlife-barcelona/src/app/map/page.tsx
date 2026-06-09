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
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")

const COLORS: Record<Filter, string> = {
  clubs: "#a855f7",
  events: "#ec4899",
  essentials: "#10b981",
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [filter, setFilter] = useState<Filter>("clubs")
  const [selected, setSelected] = useState<Club | Event | Essential | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Fetch data
  useEffect(() => {
    const fetch = async () => {
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
    fetch()
  }, [])

  // Init map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.1734, 41.3851],
      zoom: 13,
    })

    map.current.on("load", () => setMapReady(true))

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update markers when filter or data changes
  useEffect(() => {
    if (!mapReady || !map.current) return

    // Clear existing markers
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column" }}>

      {/* TOP BAR */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, background: "#000", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textDecoration: "none" }}>
            ← Back
          </Link>
          <span style={{ fontSize: "16px", fontWeight: 900, color: "#fff" }}>Barcelona</span>
        </div>

        {/* FILTERS */}
        <div style={{ display: "flex", gap: "8px" }}>
          {(["clubs", "events", "essentials"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px",
                borderRadius: "999px",
                border: filter === f ? `1px solid ${COLORS[f]}` : "1px solid rgba(255,255,255,0.1)",
                background: filter === f ? `${COLORS[f]}22` : "rgba(255,255,255,0.03)",
                color: filter === f ? COLORS[f] : "rgba(255,255,255,0.5)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* SIDEBAR */}
        <aside style={{ width: "320px", borderRight: "1px solid rgba(255,255,255,0.1)", background: "#000", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(currentList as (Club | Event | Essential)[])
                .filter((item) => item.latitude && item.longitude)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelected(item)
                      map.current?.flyTo({
                        center: [item.longitude!, item.latitude!],
                        zoom: 15,
                        duration: 800,
                      })
                    }}
                    style={{
                      textAlign: "left",
                      borderRadius: "14px",
                      border: selected && "id" in selected && selected.id === item.id
                        ? `1px solid ${COLORS[filter]}88`
                        : "1px solid rgba(255,255,255,0.08)",
                      background: selected && "id" in selected && selected.id === item.id
                        ? `${COLORS[filter]}18`
                        : "rgba(255,255,255,0.02)",
                      padding: "12px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <p style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>{getName(item)}</p>
                    <p style={{ marginTop: "2px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{getSub(item)}</p>
                  </button>
                ))}

              {(currentList as (Club | Event | Essential)[]).filter((item) => item.latitude && item.longitude).length === 0 && (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", padding: "16px", textAlign: "center" }}>
                  No {filter} with location data yet.
                </p>
              )}
            </div>
          </div>

          {/* Selected panel */}
          {selected && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ fontWeight: 900, fontSize: "16px", color: "#fff" }}>{getName(selected)}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{getSub(selected)}</p>
              {"address" in selected && selected.address && (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>📍 {selected.address}</p>
              )}
              {filter === "clubs" && (
                <Link
                  href={`/clubs/${createSlug(getName(selected))}`}
                  style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}
                >
                  View club →
                </Link>
              )}
              {filter === "events" && (
                <Link
                  href={`/event/${createSlug(getName(selected))}`}
                  style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}
                >
                  View event →
                </Link>
              )}
            </div>
          )}
        </aside>

        {/* MAP */}
        <div style={{ flex: 1, position: "relative" }}>
          <div ref={mapContainer} style={{ position: "absolute", inset: 0 }} />

          {/* Mobile selected overlay */}
          {selected && (
            <div style={{ position: "absolute", bottom: "80px", left: "16px", right: "16px", zIndex: 10, borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.9)", padding: "16px", backdropFilter: "blur(10px)" }}>
              <p style={{ fontWeight: 900, color: "#fff" }}>{getName(selected)}</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>{getSub(selected)}</p>
              {filter === "clubs" && (
                <Link
                  href={`/clubs/${createSlug(getName(selected))}`}
                  style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#fff", padding: "10px", fontSize: "13px", fontWeight: 700, color: "#000", textDecoration: "none" }}
                >
                  View club →
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