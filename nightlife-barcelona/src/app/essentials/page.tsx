"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import ArrowIcon from "../../components/ui/ArrowIcon"

const categoryConfig: Record<string, { icon: string; color: string }> = {
  Pharmacy:      { icon: "💊", color: "#10b981" },
  ATM:           { icon: "🏧", color: "#3b82f6" },
  Food:          { icon: "🍔", color: "#f97316" },
  Transport:     { icon: "🚌", color: "#8b5cf6" },
  Metro:         { icon: "🚇", color: "#dc2626" },
  Nitbus:        { icon: "🌙", color: "#6366f1" },
  Taxi:          { icon: "🚕", color: "#eab308" },
  Supermarket:   { icon: "🛒", color: "#ec4899" },
  Hotel:         { icon: "🏨", color: "#14b8a6" },
  Casino:        { icon: "🎰", color: "#f43f5e" },
  "Gas Station": { icon: "⛽", color: "#f59e0b" },
  Hospital:      { icon: "🏥", color: "#ef4444" },
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
      ([entry]) => {
        if (entry.isIntersecting) {
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

function Reveal({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={style}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function EssentialsPage() {
  const [essentials, setEssentials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const fetchEssentials = async () => {
      const { data } = await supabase.from("essentials").select("*").eq("hidden", false)
      if (data) setEssentials(data)
      setLoading(false)
    }
    fetchEssentials()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 6000 }
      )
    }
  }, [])

  const categories = Array.from(new Set(essentials.map((e) => e.category))).sort()
  const itemsByCategory = (cat: string) => essentials.filter((e) => e.category === cat)
  const countByCategory = (cat: string) => itemsByCategory(cat).length

  const coverImageByCategory = (cat: string) => {
    const withImage = itemsByCategory(cat).find((e) => e.image)
    return withImage?.image || null
  }

  const neighborhoodCount = new Set(essentials.map((e) => e.neighborhood).filter(Boolean)).size

  const nearby = userLocation
    ? essentials
        .filter((e) => e.latitude && e.longitude)
        .map((e) => ({ ...e, _dist: getDistance(userLocation.lat, userLocation.lng, e.latitude, e.longitude) }))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 8)
    : []

  const searchResults = search.trim()
    ? essentials.filter(
        (e) =>
          e.name?.toLowerCase().includes(search.toLowerCase()) ||
          e.category?.toLowerCase().includes(search.toLowerCase()) ||
          e.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
          e.address?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  return (
    <>
      <Header />
      <main className="relative min-h-screen pb-40 text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
          <div className="absolute -left-40 -top-40 h-[550px] w-[550px] rounded-full bg-purple-600/20 blur-[130px] animate-[float_18s_ease-in-out_infinite]" />
          <div className="absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-[140px] animate-[float_22s_ease-in-out_infinite_reverse]" />
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        {/* Hero */}
        <section className="px-4 pt-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-purple-300/80">{t("essentials.title")}</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">
              {t("essentials.subtitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base text-zinc-400 md:text-lg">
              Farmacias 24h, cajeros, comida, transporte y todo lo que necesitas mientras estás de fiesta en Barcelona.
            </p>

            {!loading && essentials.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-zinc-300 backdrop-blur-xl">
                  📍 {essentials.length} sitios
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-zinc-300 backdrop-blur-xl">
                  🗂️ {categories.length} categorías
                </span>
                {neighborhoodCount > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-zinc-300 backdrop-blur-xl">
                    🧭 {neighborhoodCount} barrios
                  </span>
                )}
              </div>
            )}

            {/* Search */}
            <div className="group mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-[0_20px_60px_-25px_rgba(168,85,247,0.4)] backdrop-blur-xl transition focus-within:border-purple-400/60 focus-within:bg-white/[0.09]">
              <span className="text-zinc-400 transition group-focus-within:text-purple-300">🔍</span>
              <input
                type="text"
                placeholder={t("essentials.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-500 transition hover:text-white" aria-label="Limpiar búsqueda">
                  ✕
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Search results */}
        {search.trim() && (
          <section className="mx-auto mt-10 max-w-7xl px-4">
            <p className="mb-4 text-sm text-zinc-500">
              {searchResults.length} {searchResults.length === 1 ? "resultado" : "resultados"}
            </p>
            {searchResults.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg font-bold text-zinc-300">No se encontraron resultados</p>
                <p className="mt-2 text-sm text-zinc-500">Prueba con otro nombre, categoría o barrio.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchResults.map((item, index) => {
                  const config = categoryConfig[item.category] || { icon: "📍", color: "#6b7280" }
                  return (
                    <Reveal key={item.id} style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}>
                      <Link
                        href={`/essentials/${item.category.toLowerCase().replace(/\s+/g, "-")}`}
                        className="flex items-start gap-4 rounded-[24px] border bg-white/[0.03] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-purple-400/30 hover:shadow-[0_20px_50px_-20px_rgba(168,85,247,0.35)]"
                        style={{ borderColor: `${config.color}30` }}
                      >
                        <div
                          className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-cover bg-center"
                          style={item.image ? { backgroundImage: `url(${item.image})` } : { background: `${config.color}20` }}
                        >
                          {!item.image && <div className="flex h-full w-full items-center justify-center text-2xl">{config.icon}</div>}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-white">{item.name}</h3>
                          {item.address && <p className="mt-1 truncate text-xs text-zinc-400">{item.address}</p>}
                          {item.neighborhood && <p className="mt-1 text-xs text-zinc-500">📍 {item.neighborhood}</p>}
                          {item.open_hours && (
                            <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${config.color}20`, color: config.color }}>
                              {item.open_hours}
                            </span>
                          )}
                        </div>
                      </Link>
                    </Reveal>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {!search.trim() && (
          <>
            {/* Transporte nocturno — lo primero que se busca de madrugada, así que tiene su
                propia franja destacada en vez de quedar mezclado en el grid genérico de abajo. */}
            {!loading && ["Metro", "Nitbus", "Taxi"].some((c) => countByCategory(c) > 0) && (
              <section className="mx-auto mt-12 max-w-7xl px-4">
                <div className="mb-5 flex items-baseline justify-between">
                  <h2 className="text-xl font-black text-white">🌙 Transporte nocturno</h2>
                  <span className="text-xs font-medium text-zinc-500">metro, Nitbus y taxi</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {["Metro", "Nitbus", "Taxi"].map((cat) => {
                    const config = categoryConfig[cat] || { icon: "📍", color: "#6b7280" }
                    const count = countByCategory(cat)
                    if (count === 0) return null
                    return (
                      <Link
                        key={cat}
                        href={`/essentials/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                        className="group relative flex items-center gap-4 overflow-hidden rounded-[22px] border p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1"
                        style={{ borderColor: `${config.color}35`, background: `linear-gradient(135deg, ${config.color}1c, rgba(255,255,255,0.02))`, boxShadow: `0 0 0 rgba(0,0,0,0)` }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 20px 50px -25px ${config.color}80` }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)` }}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: `${config.color}30`, border: `1px solid ${config.color}55` }}>
                          {config.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white">{t(`essentials.category_names.${cat}`) || cat}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">{count} {count === 1 ? t("essentials.locations") : t("essentials.locations_plural")}</p>
                        </div>
                        <span className="ml-auto text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white"><ArrowIcon className="h-4 w-4" /></span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Cerca de ti ahora */}
            {nearby.length > 0 && (
              <section className="mt-14">
                <div className="mx-auto max-w-7xl px-4">
                  <div className="mb-5 flex items-baseline justify-between">
                    <h2 className="text-xl font-black text-white">📍 Cerca de ti ahora</h2>
                    <span className="text-xs font-medium text-zinc-500">basado en tu ubicación</span>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto px-4 pb-2 mx-auto max-w-7xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {nearby.map((item) => {
                    const config = categoryConfig[item.category] || { icon: "📍", color: "#6b7280" }
                    const distLabel = item._dist < 1 ? `${Math.round(item._dist * 1000)} m` : `${item._dist.toFixed(1)} km`
                    return (
                      <Link
                        key={item.id}
                        href={`/essentials/${item.category.toLowerCase().replace(/\s+/g, "-")}`}
                        className="group relative h-44 w-64 shrink-0 overflow-hidden rounded-[22px] border border-white/10 transition duration-300 hover:-translate-y-1 hover:border-white/25"
                      >
                        {item.image ? (
                          <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${item.image})` }} />
                        ) : (
                          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${config.color}35, rgba(255,255,255,0.02))` }} />
                        )}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,3,8,0.05) 30%, rgba(5,3,8,0.9) 100%)" }} />
                        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                          {config.icon} {distLabel}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="truncate text-sm font-bold text-white">{item.name}</p>
                          {item.neighborhood && <p className="truncate text-xs text-zinc-300">{item.neighborhood}</p>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Categories bento grid */}
            <section className="mx-auto mt-14 max-w-7xl px-4">
              <h2 className="mb-5 text-xl font-black text-white">Explora por categoría</h2>

              {loading ? (
                <div className="grid gap-5 md:grid-cols-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`animate-pulse rounded-[28px] bg-white/[0.03] ${i < 2 ? "md:col-span-2 h-72" : "h-56"}`} />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-lg font-bold text-zinc-300">Aún no hay esenciales añadidos</p>
                </div>
              ) : (
                <div className="grid auto-rows-[220px] gap-5 md:grid-cols-4">
                  {categories.map((cat, index) => {
                    const config = categoryConfig[cat] || { icon: "📍", color: "#6b7280" }
                    const count = countByCategory(cat)
                    const cover = coverImageByCategory(cat)
                    const locationsLabel = count === 1 ? t("essentials.locations") : t("essentials.locations_plural")
                    const isFeatured = index < 2
                    return (
                      <Reveal
                        key={cat}
                        className={isFeatured ? "md:col-span-2 md:row-span-1" : "row-span-1"}
                        style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}
                      >
                        <Link
                          href={`/essentials/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                          className="group relative block h-full overflow-hidden rounded-[28px] border transition duration-500 hover:-translate-y-1.5"
                          style={{ borderColor: `${config.color}30` }}
                        >
                          {cover ? (
                            <>
                              <div
                                className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
                                style={{ backgroundImage: `url(${cover})` }}
                              />
                              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,3,8,0.1) 0%, rgba(5,3,8,0.55) 55%, rgba(5,3,8,0.95) 100%)" }} />
                            </>
                          ) : (
                            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${config.color}28 0%, rgba(255,255,255,0.02) 100%)` }} />
                          )}

                          <div className={`relative flex h-full flex-col justify-end ${isFeatured ? "p-8" : "p-6"}`}>
                            <div
                              className={`mb-3 flex items-center justify-center rounded-2xl backdrop-blur-xl ${isFeatured ? "h-12 w-12 text-2xl" : "h-10 w-10 text-xl"}`}
                              style={{ background: `${config.color}30`, border: `1px solid ${config.color}55` }}
                            >
                              {config.icon}
                            </div>
                            <h3 className={`font-black text-white ${isFeatured ? "text-3xl" : "text-xl"}`}>
                              {t(`essentials.category_names.${cat.replace(/\s+/g, "")}`) || cat}
                            </h3>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-xl" style={{ background: `${config.color}30`, color: "#fff" }}>
                                {count} {locationsLabel}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100">
                                {t("essentials.view_all")} <ArrowIcon className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </Reveal>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <BottomNav />

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.08); }
        }
      `}</style>
    </>
  )
}
