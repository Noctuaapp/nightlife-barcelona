"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"
import { getOpenStatus } from "../../lib/openStatus"

// Tres chips con lo más cercano al local (comida, súper, cajero), sacados de la tabla essentials
// (la misma que alimenta /essentials), y un enlace a todos los esenciales. Cada chip abre la ruta
// andando desde el local.
const CATS = [
  { key: "food", icon: "🍔", label: "Comida", maxMeters: 1500 },
  { key: "supermarket", icon: "🛒", label: "Súper", maxMeters: 1500 },
  { key: "atm", icon: "🏧", label: "Cajero", maxMeters: 1200 },
]

type Nearest = {
  key: string
  name: string
  open_hours: string | null
  latitude: number
  longitude: number
  distanceMeters: number
}

export default function NearbyEssentials({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [items, setItems] = useState<Record<string, Nearest | null> | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      CATS.map(async (cat) => {
        const { data } = await supabase
          .from("essentials")
          .select("name, open_hours, latitude, longitude")
          .ilike("category", cat.key)
          .eq("hidden", false)
        const nearest = ((data || []) as any[])
          .filter((e) => e.latitude && e.longitude)
          .map((e) => ({
            key: cat.key,
            name: e.name as string,
            open_hours: e.open_hours as string | null,
            latitude: Number(e.latitude),
            longitude: Number(e.longitude),
            distanceMeters: distanceInMeters(latitude, longitude, Number(e.latitude), Number(e.longitude)),
          }))
          .filter((r) => r.distanceMeters <= cat.maxMeters)
          .sort((a, b) => a.distanceMeters - b.distanceMeters)[0]
        return [cat.key, nearest || null] as const
      })
    ).then((pairs) => {
      if (!cancelled) setItems(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [latitude, longitude])

  const found = items ? CATS.filter((c) => items[c.key]) : []

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Cerca de este local</p>

      <div className="flex flex-wrap gap-2.5">
        {items === null &&
          CATS.map((c) => <div key={c.key} className="h-11 w-44 animate-pulse rounded-full bg-white/[0.04]" />)}

        {found.map((cat) => {
          const r = items![cat.key]!
          const st = getOpenStatus(r.open_hours)
          return (
            <a
              key={cat.key}
              href={walkingDirectionsUrl(latitude, longitude, r.latitude, r.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${cat.label}: ${r.name} — ir andando`}
              className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:bg-white/[0.1]"
            >
              <span>{cat.icon}</span>
              <span className="min-w-0 truncate font-semibold">{r.name}</span>
              <span className="shrink-0 text-xs text-zinc-400">
                {formatDistance(r.distanceMeters)} · {walkingMinutes(r.distanceMeters)} min
              </span>
              {st.state !== "unknown" && (
                <span className={`h-2 w-2 shrink-0 rounded-full ${st.state === "open" ? "bg-emerald-400" : "bg-red-400"}`} aria-label={st.label} />
              )}
            </a>
          )
        })}

        {items !== null && found.length === 0 && (
          <p className="text-sm text-zinc-500">Aún no tenemos sitios registrados cerca de este local.</p>
        )}
      </div>

      <Link href="/essentials" className="mt-3 inline-block text-xs font-semibold text-zinc-400 underline underline-offset-2 hover:text-white">
        Ver más esenciales →
      </Link>
    </div>
  )
}
