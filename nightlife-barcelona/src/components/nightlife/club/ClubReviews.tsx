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
      <div className="rounded-card border border-white/10 bg-surface p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            {rating && <p className="font-display text-4xl text-ink">{Number(rating).toFixed(1)}</p>}
            <div>
              {rating && <Stars rating={rating} size="h-4 w-4" />}
              <p className="mt-1 text-xs text-zinc-400">
                {(count || reviews.length).toLocaleString("es-ES")} {t("clubPage.reviewsCount")}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Icon name="google" className="h-3.5 w-3.5" /> {t("clubPage.googleReviews")}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-ctl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{r.author_name}</p>
                {r.rating ? <Stars rating={r.rating} /> : null}
              </div>
              {r.relative_time && <p className="mt-0.5 text-xs text-zinc-400">{r.relative_time}</p>}
              {r.text && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-zinc-300">{r.text}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
