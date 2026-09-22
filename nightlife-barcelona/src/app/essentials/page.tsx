"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

const categoryConfig: Record<string, { icon: string; color: string }> = {
  Pharmacy:      { icon: "💊", color: "#10b981" },
  ATM:           { icon: "🏧", color: "#3b82f6" },
  Food:          { icon: "🍔", color: "#f97316" },
  Transport:     { icon: "🚌", color: "#8b5cf6" },
  Taxi:          { icon: "🚕", color: "#eab308" },
  Supermarket:   { icon: "🛒", color: "#ec4899" },
  Hotel:         { icon: "🏨", color: "#14b8a6" },
  Casino:        { icon: "🎰", color: "#f43f5e" },
  "Gas Station": { icon: "⛽", color: "#f59e0b" },
  Hospital:      { icon: "🏥", color: "#ef4444" },
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
  const { t } = useLanguage()

  useEffect(() => {
    const fetchEssentials = async () => {
      const { data } = await supabase.from("essentials").select("*").eq("hidden", false)
      if (data) setEssentials(data)
      setLoading(false)
    }
    fetchEssentials()
  }, [])

  const categories = Array.from(new Set(essentials.map((e) => e.category))).sort()
  const countByCategory = (cat: string) => essentials.filter((e) => e.category === cat).length

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
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-[float_18s_ease-in-out_infinite]" />
          <div className="absolute -right-40 top-1/3 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[130px] animate-[float_22s_ease-in-out_infinite_reverse]" />
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
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("essentials.title")}</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-white md:text-6xl">{t("essentials.subtitle")}</h1>
          </div>
        </section>

        {/* Search */}
        <section className="mx-auto mt-8 max-w-7xl px-4">
          <div className="group flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 backdrop-blur-xl transition focus-within:border-purple-400/50 focus-within:bg-white/[0.08]">
            <span className="text-zinc-500 transition group-focus-within:text-purple-300">🔍</span>
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
        </section>

        {/* Search results */}
        {search.trim() && (
          <section className="mx-auto mt-8 max-w-7xl px-4">
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
                        className="block rounded-[24px] border bg-white/[0.03] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-purple-400/30 hover:shadow-[0_20px_50px_-20px_rgba(168,85,247,0.35)]"
                        style={{ borderColor: `${config.color}30` }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{config.icon}</span>
                          <div>
                            <h3 className="font-bold text-white">{item.name}</h3>
                            {item.address && <p className="mt-1 text-xs text-zinc-400">{item.address}</p>}
                            {item.neighborhood && <p className="mt-1 text-xs text-zinc-500">📍 {item.neighborhood}</p>}
                            {item.open_hours && (
                              <span
                                className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                                style={{ background: `${config.color}20`, color: config.color }}
                              >
                                {item.open_hours}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* Categories grid */}
        {!search.trim() && (
          <section className="mx-auto mt-8 max-w-7xl px-4">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-[32px] bg-white/[0.03]" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg font-bold text-zinc-300">Aún no hay esenciales añadidos</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((cat, index) => {
                  const config = categoryConfig[cat] || { icon: "📍", color: "#6b7280" }
                  const count = countByCategory(cat)
                  const locationsLabel = count === 1 ? t("essentials.locations") : t("essentials.locations_plural")
                  return (
                    <Reveal key={cat} style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}>
                      <Link
                        href={`/essentials/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                        className="group relative block overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-white/20"
                        style={{
                          borderColor: `${config.color}30`,
                          background: `linear-gradient(135deg, ${config.color}15 0%, rgba(255,255,255,0.02) 100%)`,
                        }}
                      >
                        <div className="mb-4 text-5xl">{config.icon}</div>
                        <h2 className="text-3xl font-black text-white">
                          {t(`essentials.category_names.${cat.replace(/\s+/g, "")}`) || cat}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">{t(`essentials.categories.${cat.replace(/\s+/g, "")}`) || ""}</p>
                        <div className="mt-6 flex items-center justify-between">
                          <span
                            className="rounded-full px-4 py-1.5 text-xs font-semibold"
                            style={{ background: `${config.color}20`, color: config.color }}
                          >
                            {count} {locationsLabel}
                          </span>
                          <span className="text-sm text-zinc-500 transition group-hover:text-white">{t("essentials.view_all")} →</span>
                        </div>
                      </Link>
                    </Reveal>
                  )
                })}
              </div>
            )}
          </section>
        )}
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