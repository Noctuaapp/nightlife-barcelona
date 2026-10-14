"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"
import { getOpenStatus } from "../../lib/openStatus"
import { cleanEssential } from "../../lib/essentials"
import { categoryInfo, categoryNameKey } from "../../lib/essentialCategories"
import { useLanguage } from "../../context/LanguageContext"

// Tres chips con lo más cercano al local (comida, súper, cajero), sacados de la tabla essentials
// (la misma que alimenta /essentials), y un enlace a todos los esenciales. Cada chip abre la ruta
// andando desde el local.
const CATS = [
  { key: "food", cat: "Food", maxMeters: 1500 },
  { key: "supermarket", cat: "Supermarket", maxMeters: 1500 },
  { key: "atm", cat: "ATM", maxMeters: 1200 },
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
        // Los cajeros con comisión alta (Euronet) no se sugieren como "el más cercano".
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
      <p className="mb-3 text-sm font-semibold text-ink">{t("nearbyEssentials.title")}</p>

      <div className="flex flex-wrap gap-2.5">
        {items === null &&
          CATS.map((c) => <div key={c.key} className="h-11 w-44 animate-pulse rounded-full bg-white/5" />)}

        {found.map((cat) => {
          const r = items![cat.key]!
          const st = getOpenStatus(r.open_hours, t)
          const CatIcon = categoryInfo(cat.cat).icon
          const catName = t(categoryNameKey(cat.cat))
          return (
            <a
              key={cat.key}
              href={walkingDirectionsUrl(latitude, longitude, r.latitude, r.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${catName}: ${r.name}`}
              aria-label={`${catName}: ${r.name}, ${formatDistance(r.distanceMeters)}`}
              className="flex max-w-full items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-ink transition hover:bg-white/5"
            >
              <CatIcon size={16} className="shrink-0 text-brand-soft" />
              <span className="min-w-0 truncate font-semibold">{r.name}</span>
              <span className="shrink-0 text-xs text-zinc-400">
                {formatDistance(r.distanceMeters)} · {walkingMinutes(r.distanceMeters)} min
              </span>
              {st.state !== "unknown" && (
                <span className={`h-2 w-2 shrink-0 rounded-full ${st.state === "open" ? "bg-open" : "bg-off"}`} title={st.label} />
              )}
            </a>
          )
        })}

        {items !== null && found.length === 0 && (
          <p className="text-sm text-zinc-400">{t("nearbyEssentials.none")}</p>
        )}
      </div>

      <Link href="/essentials" className="mt-3 inline-block text-sm font-semibold text-zinc-300 underline underline-offset-4 hover:text-ink">
        {t("nearbyEssentials.more")}
      </Link>
    </div>
  )
}
