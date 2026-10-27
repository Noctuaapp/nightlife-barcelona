"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../../ui/SafeImage"
import Icon from "../../ui/Icon"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"
import { createSlug } from "../../../lib/slug"
import { toDateLocale } from "../../../lib/dateLocale"
import { track } from "../../../lib/track"
import { FALLBACK_IMAGE } from "../../../lib/fallbackImage"

// «Más eventos que vienen» (27/10/2026), en la ficha de un evento. Quien llega desde Google a un
// evento miraba los datos y se iba: la ficha no tenía ningún enlace a otro evento. Esta tira
// enseña los próximos eventos (los que aún no han terminado, por fecha) para que sigan dentro.
// Si no hay otros eventos próximos, no se pinta nada.

type Row = {
  id: number
  title: string
  slug: string | null
  image: string | null
  date: string | null
  date_end: string | null
  price: string | null
  club_name: string | null
}

const dateOnly = (value: string) => new Date(value.length <= 10 ? `${value}T12:00:00` : value)

export default function MoreEventsStrip({ eventId, eventName }: { eventId: number; eventName: string }) {
  const { t, locale } = useLanguage()
  const [items, setItems] = useState<Row[] | null>(null)

  useEffect(() => {
    let alive = true
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()) // AAAA-MM-DD
    supabase
      .from("events")
      .select("id, title, slug, image, date, date_end, price, club_name")
      .eq("hidden", false)
      .neq("id", eventId)
      .or(`date.gte.${today},date_end.gte.${today}`)
      .order("date", { ascending: true })
      .limit(8)
      .then(({ data }) => {
        if (alive) setItems((data as Row[] | null) || [])
      })
    return () => {
      alive = false
    }
  }, [eventId])

  if (!items || items.length === 0) return null

  const fmt = (d: string) =>
    dateOnly(d).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" })

  return (
    <section className="mx-auto mt-10 max-w-6xl sm:px-6" aria-label={t("eventPage.moreEvents")}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4 sm:px-0">
        <h2 className="text-base font-semibold text-ink">{t("eventPage.moreEvents")}</h2>
        <Link
          href="/events"
          onClick={() => track("related_click", { itemType: "event", itemId: eventId, itemName: eventName, meta: { to: "events" } })}
          className="shrink-0 text-xs font-semibold text-brand-soft hover:underline"
        >
          {t("home.seeAll")}
        </Link>
      </div>
      <ul className="scrollbar-none flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:px-0">
        {items.map((r) => (
          <li key={r.id} className="w-[58%] shrink-0 snap-start sm:w-[28%]">
            <Link
              href={`/event/${r.slug || createSlug(r.title)}`}
              onClick={() => track("related_click", { itemType: "event", itemId: eventId, itemName: eventName, meta: { to: r.title } })}
              className="block overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25"
            >
              <div className="relative h-28">
                <Image src={r.image || FALLBACK_IMAGE} alt={r.title} fill sizes="(max-width: 640px) 58vw, 28vw" unoptimized={!r.image} className="object-cover" />
                {r.date && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-night/80 px-2 py-0.5 text-[10px] font-bold text-ink">
                    <Icon name="calendar" className="h-3 w-3" /> {fmt(r.date)}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400">{[r.club_name, r.price].filter(Boolean).join(" · ") || "Barcelona"}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
