"use client"

import { useState } from "react"
import { Clock, Headphones, MapPin } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

// Programa de un evento de varios días: pestañas por fecha y sesiones de ese día.
type Session = {
  id: number
  event_id: number
  date: string | null
  title: string | null
  artist: string | null
  stage: string | null
  start_time: string | null
  end_time: string | null
  description: string | null
}

export default function EventSessionsCalendar({ sessions }: { sessions: Session[]; eventName?: string }) {
  const { t, locale } = useLanguage()
  const byDay: Record<string, Session[]> = {}
  sessions.forEach((s) => {
    if (s.date) (byDay[s.date] ||= []).push(s)
  })
  const dates = Object.keys(byDay).sort()
  const [selected, setSelected] = useState<string>(dates[0] || "")
  const list = (byDay[selected] || []).slice().sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00`).toLocaleDateString(toDateLocale(locale), o)

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-ink">{t("eventSessions.title")}</h2>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]" role="tablist">
        {dates.map((date) => {
          const active = selected === date
          return (
            <button
              key={date}
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(date)}
              className={`flex min-w-[72px] flex-col items-center rounded-ctl px-3 py-2 text-center transition ${active ? "bg-brand text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`}
            >
              <span className="text-xs font-semibold capitalize">{fmt(date, { weekday: "short" }).replace(".", "")}</span>
              <span className="text-xs">{fmt(date, { day: "numeric", month: "short" })}</span>
            </button>
          )
        })}
      </div>

      <ul className="mt-4 space-y-2">
        {list.length === 0 ? (
          <li className="text-sm text-zinc-400">{t("eventSessions.none")}</li>
        ) : (
          list.map((s) => (
            <li key={s.id} className="rounded-ctl border border-white/10 p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                {s.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {s.start_time}
                    {s.end_time ? `–${s.end_time}` : ""}
                  </span>
                )}
                {s.stage && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {s.stage}
                  </span>
                )}
              </div>
              {s.title && <h3 className="mt-1 text-base font-semibold text-ink">{s.title}</h3>}
              {s.artist && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
                  <Headphones size={14} className="text-brand-soft" /> {s.artist}
                </p>
              )}
              {s.description && <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">{s.description}</p>}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
