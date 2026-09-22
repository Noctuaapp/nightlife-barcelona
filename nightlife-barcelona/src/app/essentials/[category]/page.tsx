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

const categoryConfig: Record<string, { icon: string; color: string; key: string }> = {
  pharmacy: { icon: "💊", color: "#10b981", key: "Pharmacy" },
  atm: { icon: "🏧", color: "#3b82f6", key: "ATM" },
  food: { icon: "🍔", color: "#f97316", key: "Food" },
  transport: { icon: "🚌", color: "#8b5cf6", key: "Transport" },
  taxi: { icon: "🚕", color: "#eab308", key: "Taxi" },
  supermarket: { icon: "🛒", color: "#ec4899", key: "Supermarket" },
  hotel: { icon: "🏨", color: "#14b8a6", key: "Hotel" },
  casino: { icon: "🎰", color: "#f43f5e", key: "Casino" },
  "gas-station": { icon: "⛽", color: "#f59e0b", key: "GasStation" },
  hospital: { icon: "🏥", color: "#ef4444", key: "Hospital" },
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

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  const config = categoryConfig[category] || categoryConfig["other"]
  const { t } = useLanguage()
  const label = t("essentials.category_names." + config.key)

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

  useEffect(() => {
    const fetchEssentials = async () => {
      const { data } = await supabase.from("essentials").select("*").ilike("category", category).order("name")
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

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const latitude = pos.coords.latitude
          const longitude = pos.coords.longitude

          setUserLocation({ lat: latitude, lng: longitude })

          new mapboxgl.Marker({ color: "#a855f7" }).setLngLat([longitude, latitude]).addTo(map.current!)

          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            duration: 1000,
          })
        })
      }
    })

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
        const marker = new mapboxgl.Marker({ color: config.color }).setLngLat([item.longitude!, item.latitude!]).addTo(map.current!)

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

  const filteredEssentials = essentials
    .filter((e) => (selectedNeighborhood === "All" ? true : e.neighborhood === selectedNeighborhood))
    .slice()
    .sort((a, b) => {
      if (!sortByDistance || !userLocation) return 0
      const da = a.latitude && a.longitude ? getDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : Infinity
      const db = b.latitude && b.longitude ? getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : Infinity
      return da - db
    })

  return (
    <>
      <Header />
      <main className="relative min-h-screen pb-40 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
          <div
            className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-[120px] animate-[float_18s_ease-in-out_infinite]"
            style={{ background: config.color + "25" }}
          />
          <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[130px] animate-[float_22s_ease-in-out_infinite_reverse]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <Link href="/essentials" className="text-sm text-zinc-500 transition hover:text-white">
              ← {t("essentials.title")}
            </Link>
            <div className="mt-4 flex items-center gap-4">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
                style={{ background: config.color + "20", border: "1px solid " + config.color + "40" }}
              >
                {config.icon}
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("essentials.title")}</p>
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">{label}</h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-zinc-400">
              {filteredEssentials.length} {filteredEssentials.length !== 1 ? t("essentials.locations_plural") : t("essentials.locations")}
            </p>
          </div>
        </section>

        <Reveal className="mx-auto mt-10 max-w-7xl px-4">
          <div className="overflow-hidden rounded-[32px] border" style={{ height: "420px", borderColor: config.color + "30" }}>
            <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
          </div>
        </Reveal>

        <section className="mx-auto mt-8 max-w-7xl px-4">
          <div className="flex flex-wrap items-center gap-3">
            {neighborhoods.length > 2 && (
              <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
                {neighborhoods.map((n) => {
                  const isActive = selectedNeighborhood === n
                  const chipClass = isActive
                    ? "whitespace-nowrap rounded-full px-5 py-3 text-sm font-medium transition bg-white text-black"
                    : "whitespace-nowrap rounded-full px-5 py-3 text-sm font-medium transition border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  return (
                    <button key={n || "all"} onClick={() => setSelectedNeighborhood(n || "All")} className={chipClass}>
                      {n}
                    </button>
                  )
                })}
              </div>
            )}
            {userLocation && (
              <button
                onClick={() => setSortByDistance(!sortByDistance)}
                className={
                  sortByDistance
                    ? "shrink-0 rounded-full px-5 py-3 text-sm font-bold transition bg-purple-500 text-white"
                    : "shrink-0 rounded-full px-5 py-3 text-sm font-bold transition border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                }
              >
                📍 Más cercano primero
              </button>
            )}
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-7xl px-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-[24px] bg-white/[0.03]" />
              ))}
            </div>
          ) : filteredEssentials.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg font-bold text-zinc-300">No hay resultados en este barrio</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEssentials.map((item, index) => {
                const hasCoords = Boolean(item.latitude && item.longitude)

                let distanceLabel = ""
                if (userLocation && hasCoords) {
                  const d = getDistance(userLocation.lat, userLocation.lng, item.latitude as number, item.longitude as number)
                  distanceLabel = d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1) + " km"
                }

                let directionsHref = ""
                if (hasCoords) {
                  if (userLocation) {
                    directionsHref =
                      "https://www.google.com/maps/dir/?api=1&origin=" +
                      userLocation.lat +
                      "," +
                      userLocation.lng +
                      "&destination=" +
                      item.latitude +
                      "," +
                      item.longitude
                  } else {
                    directionsHref = "https://www.google.com/maps/dir/?api=1&destination=" + item.latitude + "," + item.longitude
                  }
                }

                const reportHref = "/contact?type=report_issue&subject=" + encodeURIComponent("Reporte: " + item.name)

                const isSelected = selected != null && selected.id === item.id
                const cardBorderColor = isSelected ? config.color + "60" : "rgba(255,255,255,0.08)"
                const cardBackground = isSelected ? config.color + "15" : "rgba(255,255,255,0.03)"

                const handleCardClick = () => {
                  setSelected(item)
                  if (hasCoords) {
                    map.current?.flyTo({
                      center: [item.longitude as number, item.latitude as number],
                      zoom: 16,
                      duration: 800,
                    })
                  }
                }

                const stopPropagation = (e: React.MouseEvent) => {
                  e.stopPropagation()
                }

                return (
                  <Reveal key={item.id} style={{ transitionDelay: Math.min(index, 8) * 60 + "ms" }}>
                    <div
                      onClick={handleCardClick}
                      className="cursor-pointer rounded-[24px] border p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1"
                      style={{ borderColor: cardBorderColor, background: cardBackground }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white">{item.name}</h3>
                          {item.address && <p className="mt-1 text-sm text-zinc-400">{item.address}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            {item.neighborhood && <span>📍 {item.neighborhood}</span>}
                            {distanceLabel && (
                              <span className="rounded-full bg-purple-400/10 px-2 py-0.5 font-semibold text-purple-300">
                                {distanceLabel}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.open_hours && (
                          <span
                            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                            style={{ background: config.color + "20", color: config.color }}
                          >
                            {item.open_hours}
                          </span>
                        )}
                      </div>

                      {item.description && <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{item.description}</p>}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.maps_link && (
                          <a href={item.maps_link} target="_blank" rel="noopener noreferrer" onClick={stopPropagation} className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-black">
                            Ver en Maps →
                          </a>
                        )}

                        {hasCoords && (
                          <a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={stopPropagation} className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-300 transition hover:bg-purple-500 hover:text-white">
                            🧭 Cómo llegar
                          </a>
                        )}

                        <a href={reportHref} onClick={stopPropagation} className="inline-block rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-500 transition hover:text-white">
                          ⚑ Reportar
                        </a>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <BottomNav />

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -20px) scale(1.08);
          }
        }
      `}</style>
    </>
  )
}