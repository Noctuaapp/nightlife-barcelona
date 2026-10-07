"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"

// Sugerencias de "esenciales" (tabla essentials, la misma que alimenta /essentials) cerca del
// local, por categoría. Se cargan al pulsar cada categoría, no todas de golpe.
const CATEGORIES: { key: string; icon: string; label: string; maxMeters: number }[] = [
  { key: "food", icon: "🍔", label: "Comer", maxMeters: 1500 },
  { key: "supermarket", icon: "🛒", label: "Súper", maxMeters: 1500 },
  { key: "pharmacy", icon: "💊", label: "Farmacia", maxMeters: 2000 },
  { key: "atm", icon: "🏧", label: "Cajero", maxMeters: 1000 },
  { key: "hospital", icon: "🏥", label: "Hospital", maxMeters: 6000 },
  { key: "gas-station", icon: "⛽", label: "Gasolinera", maxMeters: 6000 },
  { key: "hotel", icon: "🏨", label: "Hotel", maxMeters: 2000 },
]

type Row = {
  id: number
  name: string
  address: string | null
  open_hours: string | null
  latitude: number
  longitude: number
  distanceMeters: number
}

export default function NearbyEssentials({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [active, setActive] = useState("food")
  const [cache, setCache] = useState<Record<string, Row[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cache[active]) return
    const cat = CATEGORIES.find((c) => c.key === active)
    if (!cat) return
    let cancelled = false
    setLoading(true)
    supabase
      .from("essentials")
      .select("id, name, address, open_hours, latitude, longitude")
      .ilike("category", active)
      .eq("hidden", false)
      .then(({ data }) => {
        if (cancelled) return
        const rows: Row[] = ((data || []) as any[])
          .filter((e) => e.latitude && e.longitude)
          .map((e) => ({
            id: e.id,
            name: e.name,
            address: e.address,
            open_hours: e.open_hours,
            latitude: Number(e.latitude),
            longitude: Number(e.longitude),
            distanceMeters: distanceInMeters(latitude, longitude, Number(e.latitude), Number(e.longitude)),
          }))
          .filter((r) => r.distanceMeters <= cat.maxMeters)
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, 3)
        setCache((prev) => ({ ...prev, [active]: rows }))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, latitude, longitude])

  const rows = cache[active]
  const activeCat = CATEGORIES.find((c) => c.key === active)

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-zinc-500">Cerca de este local</p>
      <p className="mb-4 text-sm text-zinc-400">Dónde comer, comprar o resolver algo sin alejarte mucho.</p>

      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActive(c.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === c.key ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2.5">
        {loading && !rows && [0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />)}

        {rows && rows.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-zinc-500">
            No tenemos {activeCat?.label.toLowerCase()} registrados cerca de este local todavía.
          </p>
        )}

        {rows &&
          rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-200">
                {formatDistance(r.distanceMeters)} · {walkingMinutes(r.distanceMeters)} min
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{r.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {[r.address, r.open_hours].filter(Boolean).join(" · ") || "Barcelona"}
                </p>
              </div>
              <a
                href={walkingDirectionsUrl(latitude, longitude, r.latitude, r.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-semibold text-purple-300 underline underline-offset-2 hover:text-purple-200"
              >
                Ir andando
              </a>
            </div>
          ))}
      </div>
    </div>
  )
}
