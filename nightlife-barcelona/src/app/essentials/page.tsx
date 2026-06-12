"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

const categoryConfig: Record<string, { icon: string; color: string; description: string }> = {
  Pharmacy:    { icon: "💊", color: "#10b981", description: "24h pharmacies across Barcelona" },
  ATM:         { icon: "🏧", color: "#3b82f6", description: "Cash machines open all night" },
  Food:        { icon: "🍔", color: "#f97316", description: "Late night food and restaurants" },
  Transport:   { icon: "🚌", color: "#8b5cf6", description: "Night buses and metro lines" },
  Taxi:        { icon: "🚕", color: "#eab308", description: "Taxi ranks and pickup points" },
  Supermarket: { icon: "🛒", color: "#ec4899", description: "24h supermarkets and convenience stores" },
  Other:       { icon: "📍", color: "#6b7280", description: "Other useful services" },
}

export default function EssentialsPage() {
  const [essentials, setEssentials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Essentials</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              Barcelona after-dark essentials
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Useful late-night services for nightlife, emergencies and surviving the city after dark.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-7xl px-4">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">Loading essentials...</p>
          ) : categories.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-20">No essentials added yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((cat, index) => {
                const config = categoryConfig[cat] || categoryConfig["Other"]
                const count = countByCategory(cat)
                return (
                  <Link
                    key={cat}
                    href={`/essentials/${cat.toLowerCase()}`}
                    className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-8 transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
                    style={{
                      animationDelay: `${index * 0.08}s`,
                      borderColor: `${config.color}30`,
                      background: `linear-gradient(135deg, ${config.color}15 0%, rgba(255,255,255,0.02) 100%)`,
                    }}
                  >
                    <div className="text-5xl mb-4">{config.icon}</div>
                    <h2 className="text-3xl font-black text-white">{cat}</h2>
                    <p className="mt-2 text-zinc-400 text-sm">{config.description}</p>
                    <div className="mt-6 flex items-center justify-between">
                      <span
                        className="rounded-full px-4 py-1.5 text-xs font-semibold"
                        style={{ background: `${config.color}20`, color: config.color }}
                      >
                        {count} location{count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-zinc-500 text-sm group-hover:text-white transition">
                        View all →
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