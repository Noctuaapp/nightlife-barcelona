"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

export default function EssentialsPage() {
  const [essentials, setEssentials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("All")

  useEffect(() => {
    const fetchEssentials = async () => {
      const { data } = await supabase.from("essentials").select("*")
      if (data) setEssentials(data)
      setLoading(false)
    }
    fetchEssentials()
  }, [])

  const categories = ["All", ...Array.from(new Set(essentials.map((e) => e.category)))]

  const filteredEssentials = essentials.filter((item) =>
    selectedCategory === "All" ? true : item.category === selectedCategory
  )

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

        <section className="mx-auto mt-12 max-w-7xl px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 px-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">Loading essentials...</p>
          ) : filteredEssentials.length === 0 ? (
            <p className="text-zinc-500 text-sm col-span-3 text-center py-20">
              {essentials.length === 0 ? "No essentials added yet." : "No items in this category."}
            </p>
          ) : (
            filteredEssentials.map((item, index) => (
              <div
                key={item.id}
                className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-2 hover:border-white/20 fade-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="relative h-[420px] overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  <div className="absolute left-5 top-5">
                    <div className="w-fit rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl">
                      {item.category}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-6">
                    <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="mt-4 text-zinc-300 line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
                      {item.open_hours && <span>🕒 {item.open_hours}</span>}
                      {item.neighborhood && <span>📍 {item.neighborhood}</span>}
                    </div>
                    {item.maps_link && (
                      <div className="mt-6">
                        
                          href={item.maps_link}
                          target="_blank"
                          <a rel="noopener noreferrer"
                          className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-105 inline-block"
                        >
                          Open in Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}