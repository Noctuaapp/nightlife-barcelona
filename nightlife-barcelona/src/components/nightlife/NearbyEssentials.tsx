"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"
import { getOpenStatus } from "../../lib/openStatus"
import { cleanEssential } from "../../lib/essentials"
import { categoryInfo, categoryNameKey } from "../../lib/essentialCategories"
import { useLanguage } from "../../context/LanguageContext"
import { track } from "../../lib/track"
import { Navigation } from "lucide-react"

// «Cerca de este local»: lo que te hace falta antes o después de la noche. Supermercados y comida
// (los dos más cercanos de cada uno) y el cajero más cercano, sacados de la tabla essentials (la
// misma que alimenta /essentials). Cada fila abre la ruta andando desde el local.
const CATS = [
  { key: "supermarket", cat: "Supermarket", maxMeters: 2000, count: 2 },
  { key: "food", cat: "Food", maxMeters: 2000, count: 2 },
  { key: "atm", cat: "ATM", maxMeters: 1500, count: 1 },
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
  const [items, setItems] = useState<Record<string, Nearest[]> | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    let cancelled = false
    Promise.all(
      CATS.map(async (cat) => {
        const { data } = await supabase
          .from("essentials")
          .select("name, open_hours, latitude, longitude")
          .ilike("category", cat.key)
          .eq("hidden", false)
        // Los cajeros con comisión alta (Euronet) no se sugieren como «el más cercano».
        const nearest = ((data || []) as any[])
          .map((e) => cleanEssential({ ...e, category: cat.key }))
          .filter((e) => e.latitude && e.longitude && !e.highFee)
          .map((e) => ({
            key: cat.key,
            name: e.name as string,
            open_hours: e.open_hours as string | null,
            latitude: Number(e.latitude),
            longitude: Number(e.longitude),
            distanceMeters: distanceInMeters(latitude, longitude, Number(e.latitude), Number(e.longitude)),
          }))
          .filter((r) => r.distanceMeters <= cat.maxMeters)
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, cat.count)
        return [cat.key, nearest] as const
      })
    ).then((pairs) => {
      if (!cancelled) setItems(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [latitude, longitude])

  const found = items ? CATS.filter((c) => items[c.key]?.length) : []

  return (
    <div>
      <p className="mb-4 text-base font-semibold text-ink">{t("nearbyEssentials.title")}</p>

      {items === null && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-ctl bg-white/5" />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {found.map((cat) => {
          const CatIcon = categoryInfo(cat.cat).icon
          const catName = t(categoryNameKey(cat.cat))
          return (
            <div key={cat.key}>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
                <CatIcon size={14} className="shrink-0" /> {catName}
              </p>
              <ul className="space-y-2">
                {items![cat.key].map((r) => {
                  const st = getOpenStatus(r.open_hours, t)
                  return (
                    <li key={r.name + r.latitude}>
                      <a
                        href={walkingDirectionsUrl(latitude, longitude, r.latitude, r.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("essential_nearby", { itemType: "essential_nearby", itemName: r.name, meta: { category: cat.key } })}
                        aria-label={`${catName}: ${r.name}, ${formatDistance(r.distanceMeters)}`}
                        className="flex items-center gap-3 rounded-ctl bg-white/[0.04] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-white/[0.07]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                            {formatDistance(r.distanceMeters)} · {walkingMinutes(r.distanceMeters)} min
                            {st.state !== "unknown" && (
                              <>
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.state === "open" ? "bg-open" : "bg-off"}`} />
                                <span className="truncate">{st.label}</span>
                              </>
                            )}
                          </span>
                        </span>
                        <Navigation size={16} className="shrink-0 text-zinc-400" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {items !== null && found.length === 0 && <p className="text-sm text-zinc-400">{t("nearbyEssentials.none")}</p>}
      </div>

      <Link href="/essentials" className="mt-4 inline-block text-sm font-semibold text-zinc-300 underline underline-offset-4 hover:text-ink">
        {t("nearbyEssentials.more")}
      </Link>
    </div>
  )
}
