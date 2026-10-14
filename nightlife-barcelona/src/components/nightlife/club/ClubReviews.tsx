"use client"

import { useEffect, useState } from "react"
import Icon from "../../ui/Icon"
import Stars from "./Stars"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"

type Review = { id: number; author_name: string; rating: number | null; relative_time: string | null; text: string | null }

// Reseñas de Google, al final de la ficha (son validación social que se lee cuando ya estás
// convencido) y siempre atribuidas a Google.
export default function ClubReviews({
  clubId,
  rating,
  count,
  table = "club_reviews",
  column = "club_id",
}: {
  clubId: number
  rating: number | null
  count: number | null
  table?: "club_reviews" | "event_reviews"
  column?: "club_id" | "event_id"
}) {
  const { t } = useLanguage()
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    supabase
      .from(table)
      .select("id, author_name, rating, relative_time, text")
      .eq(column, clubId)
      .order("rating", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setReviews(data as Review[])
      })
  }, [clubId, table, column])

  if (reviews.length === 0) return null

  return (
    <section className="mx-auto mb-16 max-w-6xl px-4 sm:px-6" aria-label={t("clubPage.reviews")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {rating && <p className="font-display text-3xl text-ink">{Number(rating).toFixed(1)}</p>}
          <div>
            {rating && <Stars rating={rating} size="h-3.5 w-3.5" />}
            <p className="mt-0.5 text-xs text-zinc-400">
              {(count || reviews.length).toLocaleString("es-ES")} {t("clubPage.reviewsCount")}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
          <Icon name="google" className="h-3.5 w-3.5" /> {t("clubPage.googleReviews")}
        </span>
      </div>
      {/* Cuatro reseñas en tarjetas cuadradas (2×2 en el móvil, una fila de 4 en pantallas
          grandes) en vez de bloques alargados. */}
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
    </section>
  )
}
