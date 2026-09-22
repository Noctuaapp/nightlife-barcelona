"use client"

import { useState, useEffect } from "react"
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

  // Si hay búsqueda, mostrar items individuales
  const searchResults = search.trim()
    ? essentials.filter((e) =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase()) ||
        e.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
        e.address?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("essentials.title")}</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              {t("essentials.subtitle")}
            </h1>
          </div>
        </section>

        {/* Search */}
        <section className="mx-auto mt-8 max-w-7xl px-4">
          <div className="relative max-w-xl">
            <input
              type="text"
              placeholder={t("essentials.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "14px",
                padding: "14px 44px 14px 48px",
                fontSize: "14px",
                color: "#fff",
                outline: "none",
              }}
            />
            <svg
              style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="18" height="18" viewBox="0 0 24 24" fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Search results */}
        {search.trim() && (
          <section className="mx-auto mt-6 max-w-7xl px-4">
            {searchResults.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-10">No se encontraron resultados.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchResults.map((item) => {
                  const config = categoryConfig[item.category] || { icon: "📍", color: "#6b7280" }
                  return (
                    <Link
                      key={item.id}
                      href={`/essentials/${item.category.toLowerCase().replace(/\s+/g, "-")}`}
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:-translate-y-1"
                      style={{ borderColor: `${config.color}30` }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <h3 className="font-bold text-white">{item.name}</h3>
                          {item.address && <p className="mt-1 text-xs text-zinc-400">{item.address}</p>}
                          {item.neighborhood && <p className="mt-1 text-xs text-zinc-500">📍 {item.neighborhood}</p>}
                          {item.open_hours && (
                            <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                              style={{ background: `${config.color}20`, color: config.color }}>
                              {item.open_hours}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
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
              <p className="text-zinc-500 text-sm text-center py-20">{t("common.loading")}</p>
            ) : categories.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-20">No essentials added yet.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((cat, index) => {
                  const config = categoryConfig[cat] || { icon: "📍", color: "#6b7280" }
                  const count = countByCategory(cat)
                  const locationsLabel = count === 1 ? t("essentials.locations") : t("essentials.locations_plural")
                  return (
                    <Link
                      key={cat}
                      href={`/essentials/${cat.toLowerCase().replace(/\s+/g, "-")}`}
                      className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-8 transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
                      style={{
                        animationDelay: `${index * 0.08}s`,
                        borderColor: `${config.color}30`,
                        background: `linear-gradient(135deg, ${config.color}15 0%, rgba(255,255,255,0.02) 100%)`,
                      }}
                    >
                      <div className="text-5xl mb-4">{config.icon}</div>
                      <h2 className="text-3xl font-black text-white">{t(`essentials.category_names.${cat.replace(/\s+/g, "")}`) || cat}</h2>
                      <p className="mt-2 text-zinc-400 text-sm">{t(`essentials.categories.${cat.replace(/\s+/g, "")}`) || ""}</p>
                      <div className="mt-6 flex items-center justify-between">
                        <span
                          className="rounded-full px-4 py-1.5 text-xs font-semibold"
                          style={{ background: `${config.color}20`, color: config.color }}
                        >
                          {count} {locationsLabel}
                        </span>
                        <span className="text-zinc-500 text-sm group-hover:text-white transition">
                          {t("essentials.view_all")}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}