"use client"

import { useState } from "react"
import Link from "next/link"

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

type Props = {
  clubEvents: ClubEvent[]
  clubName: string
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const getDayIndex = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

export default function ClubNightsCalendar({ clubEvents, clubName }: Props) {
  const eventsByDay: Record<number, ClubEvent[]> = {}
  clubEvents.forEach((event) => {
    if (event.date) {
      const dayIdx = getDayIndex(event.date)
      if (!eventsByDay[dayIdx]) eventsByDay[dayIdx] = []
      eventsByDay[dayIdx].push(event)
    }
  })

  const activeDays = Object.keys(eventsByDay).map(Number).sort()
  const [selectedDay, setSelectedDay] = useState<number>(activeDays[0] ?? 4)

  const selectedEvents = eventsByDay[selectedDay] || []

  return (
    <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Sessions</p>
      <h2 className="mt-4 text-5xl font-black">Nights at {clubName}</h2>

      {/* Day tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {DAYS.map((day, idx) => {
          const hasEvents = !!eventsByDay[idx]
          const isSelected = selectedDay === idx
          return (
            <button
              key={day}
              onClick={() => hasEvents && setSelectedDay(idx)}
              disabled={!hasEvents}
              className="flex flex-col items-center rounded-2xl px-4 py-3 min-w-[60px] transition"
              style={{
                background: isSelected
                  ? "rgba(168,85,247,0.2)"
                  : hasEvents
                  ? "rgba(255,255,255,0.05)"
                  : "transparent",
                border: isSelected
                  ? "1px solid rgba(168,85,247,0.4)"
                  : hasEvents
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(255,255,255,0.03)",
                opacity: hasEvents ? 1 : 0.3,
                cursor: hasEvents ? "pointer" : "default",
              }}
            >
              <span className={`text-xs font-bold ${isSelected ? "text-purple-300" : "text-zinc-400"}`}>
                {day}
              </span>
              {hasEvents && (
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: isSelected ? "#a855f7" : "rgba(255,255,255,0.3)" }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day events */}
      <div className="mt-8 space-y-5">
        {selectedEvents.length === 0 ? (
          <p className="text-zinc-500 text-sm">No sessions on {DAY_FULL[selectedDay]}.</p>
        ) : (
          selectedEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-3xl border border-white/10 bg-black/30 p-6"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      {DAY_FULL[selectedDay]}
                      {event.date && ` · ${new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                      {event.start_time && ` · ${event.start_time}`}
                    </p>
                    {event.featured && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                        ⭐ Featured
                      </span>
                    )}
                    {event.sold_out && (
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                        🚫 Sold out
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-3xl font-black">{event.title}</h3>

                  {event.description && (
                    <p className="mt-2 text-zinc-400 text-sm line-clamp-2">{event.description}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.artist && (
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        🎧 {event.artist}
                      </span>
                    )}
                    {event.music && (
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        🎵 {event.music}
                      </span>
                    )}
                    {event.price && (
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        🎟 {event.price}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/club-event/${event.id}`}
                  className="flex shrink-0 items-center justify-center rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
                >
                  View night
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}