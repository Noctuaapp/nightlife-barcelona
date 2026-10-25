"use client"

import { useEffect, useState } from "react"
import Icon from "../../ui/Icon"
import Stars from "./Stars"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"
import { isSpanishOrCatalan } from "../../../lib/reviewLanguage"

type Review = { id: number; author_name: string; rating: number | null; relative_time: string | null; text: string | null }

// Reseñas de Google, siempre atribuidas a Google. Desde el 25/10/2026 viven en la pestaña
// «Opiniones» de la ficha (debajo de las opiniones de Noctua) en vez de al final de la página.
// Solo se enseñan las que están en castellano o catalán (las guardadas venían en el idioma de
// cada persona y muchas salían en inglés); el resto se puede leer en Google Maps con el enlace.
export default function ClubReviews({
  clubId,
  rating,
  count,
  table = "club_reviews",
  column = "club_id",
  mapsUrl,
  embedded = false,
}: {
  clubId: number
  rating: number | null
  count: number | null
  table?: "club_reviews" | "event_reviews"
  column?: "club_id" | "event_id"
  mapsUrl?: string | null
  embedded?: boolean
}) {
  const { t } = useLanguage()
  const [reviews, setReviews] = useState<Review[] | null>(null)

  useEffect(() => {
    supabase
      .from(table)
      .select("id, author_name, rating, relative_time, text")
      .eq(column, clubId)
      .order("rating", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const all = (data || []) as Review[]
        setReviews(all.filter((r) => isSpanishOrCatalan(r.text)).slice(0, 4))
      })
  }, [clubId, table, column])

  if (reviews === null) return null
  if (reviews.length === 0 && !rating) return null

  return (
    <section className={embedded ? "" : "mx-auto mb-16 max-w-6xl px-4 sm:px-6"} aria-label={t("clubPage.googleReviews")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {rating && <p className="font-display text-3xl text-ink">{Number(rating).toFixed(1)}</p>}
          <div>
            {rating && <Stars rating={rating} size="h-3.5 w-3.5" />}
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
              <Icon name="google" className="h-3 w-3" />
              {count ? `${count.toLocaleString("es-ES")} ${t("clubPage.reviewsCount")} · ` : ""}
              {t("clubPage.googleReviews")}
            </p>
          </div>
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-soft hover:underline">
            {t("clubPage.reviewsOnGoogle")}
          </a>
        )}
      </div>
      {reviews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {reviews.map((r) => (
            <article key={r.id} className="flex aspect-square flex-col overflow-hidden rounded-card border border-white/10 bg-surface p-3.5 sm:p-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-ink">
                  {(r.author_name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <p className="min-w-0 truncate text-xs font-semibold text-ink">{r.author_name}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                {r.rating ? <Stars rating={r.rating} size="h-3 w-3" /> : <span />}
                {r.relative_time && <p className="truncate text-[11px] text-zinc-400">{r.relative_time}</p>}
              </div>
              {r.text && <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-zinc-300 sm:line-clamp-6">{r.text}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

// Enlace a la ficha del local en Google Maps (con su place_id si lo tenemos).
export function googleMapsReviewsUrl(name: string, address?: string | null, placeId?: string | null): string {
  const q = encodeURIComponent([name, address].filter(Boolean).join(", "))
  return `https://www.google.com/maps/search/?api=1&query=${q}${placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : ""}`
}
