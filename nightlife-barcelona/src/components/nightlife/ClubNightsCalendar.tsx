"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

// Próximas noches del club (las que publica el local). Antes estaba entero en inglés ("Nights at",
// "View night") y agrupaba por día de la semana, mezclando noches de semanas distintas; ahora es
// una lista por fecha, solo de hoy en adelante.

type ClubEvent = {
  id: number
  title: string
  date: string | null
  start_time: string | null
  end_time: string | null
  artist: string | null
  music: string | null
  price: string | null
  description: string | null
  sold_out: boolean | null
  featured: boolean | null
}

export default function ClubNightsCalendar({ clubEvents, clubName }: { clubEvents: ClubEvent[]; clubName: string }) {
  const { t, locale } = useLanguage()
  // "Hoy" depende del día en que se mira: se calcula tras montar.
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => setToday(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())), [])

  const upcoming = clubEvents
    .filter((e) => e.date && (!today || e.date >= today))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubNights.title").replace("{name}", clubName)}</h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-400">{t("clubNights.none")}</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((night) => {
            const d = new Date(`${night.date}T12:00:00`)
            const weekday = d.toLocaleDateString(toDateLocale(locale), { weekday: "short" })
            const day = d.toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" })
            const meta = [night.start_time && `${night.start_time}${night.end_time ? `–${night.end_time}` : ""}`, night.artist, night.music, night.price].filter(Boolean).join(" · ")
            return (
              <li key={night.id}>
                <Link href={`/club-event/${night.id}`} className="flex items-center gap-4 rounded-ctl border border-white/10 p-3 transition hover:border-white/25">
                  <span className="flex w-14 shrink-0 flex-col items-center rounded-ctl bg-white/5 py-2 text-center">
                    <span className="text-xs font-semibold capitalize text-brand-soft">{weekday.replace(".", "")}</span>
                    <span className="mt-0.5 text-xs text-zinc-300">{day}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{night.title}</span>
                      {night.featured && <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-semibold text-brand-soft">{t("event.featured")}</span>}
                      {night.sold_out && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">{t("event.soldOut")}</span>}
                    </span>
                    {meta && <span className="mt-0.5 block truncate text-sm text-zinc-400">{meta}</span>}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-zinc-500" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
