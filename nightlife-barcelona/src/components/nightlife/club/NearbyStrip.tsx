"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../../ui/SafeImage"
import Icon from "../../ui/Icon"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"
import { createSlug } from "../../../lib/slug"
import { clubOpenNow } from "../../../lib/clubHours"
import { FALLBACK_IMAGE } from "../../../lib/fallbackImage"

// «Cerca de aquí» (26/10/2026). Casi todas las visitas llegan desde Google directamente a la ficha
// de un local, miran el dato que buscaban y se van. Esta tira, justo debajo de los datos
// prácticos, les enseña sitios a pocos minutos andando (primero los que están abiertos ahora y se
// parecen en estilo) para que sigan la noche dentro de Noctua. Si este local está cerrado ahora,
// el título lo dice y los abiertos van primero.

type Near = {
  id: number
  name: string
  slug: string | null
  image: string | null
  neighborhood: string | null
  music: string | null
  rating: number | null
  google_rating: number | null
  latitude: number
  longitude: number
  hours: string | null
  open_days: string[] | null
  temporarily_closed?: boolean | null
  dist: number
  open: boolean | null
}

function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLon = ((bLon - aLon) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

const fmtDist = (m: number) => (m < 950 ? `${Math.max(50, Math.round(m / 50) * 50)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`)

export default function NearbyStrip({
  club,
  openNow,
  onPick,
}: {
  club: { id: number; name: string; latitude?: number | null; longitude?: number | null; music?: string | null }
  openNow: boolean | null
  onPick?: (name: string) => void
}) {
  const { t } = useLanguage()
  const [items, setItems] = useState<Near[] | null>(null)
  const lat = Number(club.latitude)
  const lon = Number(club.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0

  useEffect(() => {
    if (!hasCoords) return
    let alive = true
    // Caja de unos 2,5 km alrededor del local (más ligero que pedir todos los clubs).
    const baseCols = "id, name, slug, image, neighborhood, music, rating, google_rating, latitude, longitude, hours, open_days"
    const query = (cols: string) =>
      supabase
        .from("clubs")
        .select(cols)
        .eq("hidden", false)
        .neq("id", club.id)
        .gte("latitude", lat - 0.023)
        .lte("latitude", lat + 0.023)
        .gte("longitude", lon - 0.031)
        .lte("longitude", lon + 0.031)
        .limit(150)
    // Si la columna «temporarily_closed» aún no existe (SQL 56 sin ejecutar), se repite sin ella.
    query(baseCols + ", temporarily_closed")
      .then((res) => (res.error ? query(baseCols) : res))
      .then(({ data }) => {
        if (!alive || !data) return
        const myMusic = String(club.music || "").toLowerCase().split(/[,/·]/).map((m) => m.trim()).filter(Boolean)
        const rows = (data as unknown as Omit<Near, "dist" | "open">[])
          // Un local cerrado temporalmente no se recomienda como plan cercano.
          .filter((r) => r.latitude && r.longitude && r.temporarily_closed !== true)
          .map((r) => ({ ...r, dist: distanceM(lat, lon, Number(r.latitude), Number(r.longitude)), open: clubOpenNow(r.hours, r.open_days) }))
          .filter((r) => r.dist <= 2500)
        const score = (r: Near) => {
          let s = 0
          s += r.open === true ? 4 : r.open === false ? -2 : 0
          s += Math.max(0, 3 - r.dist / 500) // cuanto más cerca, mejor
          const rating = Number(r.google_rating || r.rating || 0)
          s += rating >= 4 ? 1.5 : 0
          if (myMusic.some((m) => String(r.music || "").toLowerCase().includes(m))) s += 1.5
          if (r.image) s += 0.5
          return s
        }
        setItems(rows.sort((a, b) => score(b) - score(a)).slice(0, 8))
      })
    return () => {
      alive = false
    }
  }, [club.id, club.music, hasCoords, lat, lon])

  if (!hasCoords || !items || items.length < 2) return null

  const openCount = items.filter((i) => i.open === true).length
  const title = openNow === false && openCount > 0 ? t("clubPage.nearbyClosedTitle") : t("clubPage.nearbyTitle")

  return (
    <section className="mx-auto mt-8 max-w-6xl sm:px-6" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4 sm:px-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <Link href="/map" onClick={() => onPick?.("map")} className="shrink-0 text-xs font-semibold text-brand-soft hover:underline">
          {t("clubPage.nearbySeeMap")}
        </Link>
      </div>
      <ul className="scrollbar-none flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:px-0">
        {items.map((r) => {
          const rating = r.google_rating || r.rating
          return (
            <li key={r.id} className="w-[46%] shrink-0 snap-start sm:w-[23%]">
              <Link
                href={`/clubs/${r.slug || createSlug(r.name)}`}
                onClick={() => onPick?.(r.name)}
                className="block overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25"
              >
                <div className="relative h-24">
                  <Image src={r.image || FALLBACK_IMAGE} alt={r.name} fill sizes="(max-width: 640px) 46vw, 23vw" unoptimized={!r.image} className="object-cover" />
                  {r.open === true && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-night/80 px-2 py-0.5 text-[10px] font-bold text-open">
                      <span className="live-dot h-1.5 w-1.5 rounded-full bg-open" /> {t("clubPage.openNow")}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
                    <span>{fmtDist(r.dist)}</span>
                    {rating ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <Icon name="star" className="h-3 w-3 text-warn" /> {Number(rating).toFixed(1)}
                      </>
                    ) : null}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
