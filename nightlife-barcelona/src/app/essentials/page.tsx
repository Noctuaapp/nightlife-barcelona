"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

const categoryConfig: Record<string, { icon: string; color: string }> = {
  Pharmacy:    { icon: "💊", color: "#10b981" },
  ATM:         { icon: "🏧", color: "#3b82f6" },
  Food:        { icon: "🍔", color: "#f97316" },
  Transport:   { icon: "🚌", color: "#8b5cf6" },
  Taxi:        { icon: "🚕", color: "#eab308" },
  Supermarket: { icon: "🛒", color: "#ec4899" },
  Hotel:       { icon: "🏨", color: "#14b8a6" },
  Casino:      { icon: "🎰", color: "#f43f5e" },
  "Gas Station": { icon: "⛽", color: "#f59e0b" },
  Hospital:    { icon: "🏥", color: "#ef4444" },
  }

export default function EssentialsPage() {
  const [essentials, setEssentials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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

        <section className="mx-auto mt-14 max-w-7xl px-4">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">{t("common.loading")}</p>
          ) : categories.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-20">No essentials added yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((cat, index) => {
                const config = categoryConfig[cat] || categoryConfig["Other"]
                const count = countByCategory(cat)
                const description = t(`essentials.categories.${cat}`)
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
<p className="mt-2 text-zinc-400 text-sm">{t(`essentials.categories.${cat.replace(/\s+/g, "")}`) || description}</p>
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
      </main>
      <BottomNav />
    </>
  )
}