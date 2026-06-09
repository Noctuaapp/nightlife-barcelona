"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"

const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
  pharmacy:    { icon: "💊", color: "#10b981", label: "Pharmacies" },
  atm:         { icon: "🏧", color: "#3b82f6", label: "ATMs" },
  food:        { icon: "🍔", color: "#f97316", label: "Late Night Food" },
  transport:   { icon: "🚌", color: "#8b5cf6", label: "Night Transport" },
  taxi:        { icon: "🚕", color: "#eab308", label: "Taxi Ranks" },
  supermarket: { icon: "🛒", color: "#ec4899", label: "Supermarkets" },
  other:       { icon: "📍", color: "#6b7280", label: "Other" },
}

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

export default function EssentialCategoryPage() {
  const params = useParams()
  const category = (params.category as string).toLowerCase()
  const config = categoryConfig[category] || categoryConfig["other"]

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [essentials, setEssentials] = useState<Essential[]>([])
  const [selected, setSelected] = useState<Essential | null>(null)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All")
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    const fetchEssentials = async () => {
      const { data } = await supabase
        .from("essentials")
        .select("*")
        .ilike("category", category)
        .order("name")
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

    map.current.on("load", () => setMapReady(true))

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !map.current || essentials.length === 0) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    essentials
      .filter((e) => e.latitude && e.longitude)
      .forEach((item) => {
        const marker = new mapboxgl.Marker({ color: config.color })
          .setLngLat([item.longitude!, item.latitude!])
          .addTo(map.current!)

        marker.getElement().addEventListener("click", () => {
          setSelected(item)
          map.current?.flyTo({
            center: [item.longitude!, item.latitude!],
            zoom: 16,
            duration: 800,
          })
        })

        markersRef.current.push(marker)
      })
  }, [mapReady, essentials, config.color])

  const neighborhoods = ["All", ...Array.from(new Set(essentials.map((e) => e.neighborhood).filter(Boolean)))]

  const filteredEssentials = essentials.filter((e) =>
    selectedNeighborhood === "All" ? true : e.neighborhood === selectedNeighborhood
  )

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <Link href="/essentials" className="text-sm text-zinc-500 hover:text-white transition">
              ← Essentials
            </Link>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-5xl">{config.icon}</span>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Essentials</p>
                <h1 className="text-5xl font-black tracking-tight text-white">{config.label}</h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-zinc-400">
              {filteredEssentials.length} location{filteredEssentials.length !== 1 ? "s" : ""} found in Barcelona
            </p>
          </div>
        </section>

        {/* MAP */}
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="overflow-hidden rounded-[32px] border border-white/10" style={{ height: "420px" }}>
            <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
          </div>
        </section>

        {/* NEIGHBORHOOD FILTER */}
        {neighborhoods.length > 2 && (
          <section className="mx-auto mt-8 max-w-7xl px-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {neighborhoods.map((n) => (
                <button
                  key={n ?? "all"}
                  onClick={() => setSelectedNeighborhood(n ?? "All")}
                  className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                    selectedNeighborhood === n
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* LIST */}
        <section className="mx-auto mt-8 max-w-7xl px-4">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">Loading...</p>
          ) : filteredEssentials.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-20">No locations found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEssentials.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelected(item)
                    if (item.latitude && item.longitude) {
                      map.current?.flyTo({
                        center: [item.longitude, item.latitude],
                        zoom: 16,
                        duration: 800,
                      })
                    }
                  }}
                  className="cursor-pointer rounded-[24px] border p-6 transition hover:scale-[1.02]"
                  style={{
                    borderColor: selected?.id === item.id ? `${config.color}60` : "rgba(255,255,255,0.08)",
                    background: selected?.id === item.id ? `${config.color}15` : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{item.name}</h3>
                      {item.address && <p className="mt-1 text-sm text-zinc-400">{item.address}</p>}
                      {item.neighborhood && (
                        <p className="mt-1 text-xs text-zinc-500">📍 {item.neighborhood}</p>
                      )}
                    </div>
                    {item.open_hours && (
                      <span
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: `${config.color}20`, color: config.color }}
                      >
                        {item.open_hours}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{item.description}</p>
                  )}

                 {item.maps_link && (
                  <a  
                      href={item.maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 inline-block rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white hover:text-black transition"
                    >
                      Open in Maps →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}