"use client"

import { useState } from "react"
import Link from "next/link"

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

type Props = {
  sessions: Session[]
  eventName: string
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const getDayIndex = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" })

export default function EventSessionsCalendar({ sessions, eventName }: Props) {
  const sessionsByDay: Record<string, Session[]> = {}
  sessions.forEach((s) => {
    if (s.date) {
      if (!sessionsByDay[s.date]) sessionsByDay[s.date] = []
      sessionsByDay[s.date].push(s)
    }
  })

  const activeDates = Object.keys(sessionsByDay).sort()
  const [selectedDate, setSelectedDate] = useState<string>(activeDates[0] || "")

  const selectedSessions = sessionsByDay[selectedDate] || []

  return (
    <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Programa</p>
      <h2 className="mt-4 text-5xl font-black">Sessions</h2>

      {/* Date tabs */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {activeDates.map((date) => {
          const isSelected = selectedDate === date
          const dayIdx = getDayIndex(date)
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className="flex flex-col items-center rounded-2xl px-4 py-3 min-w-[72px] transition"
              style={{
                background: isSelected ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.05)",
                border: isSelected ? "1px solid rgba(236,72,153,0.4)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className={`text-xs font-bold ${isSelected ? "text-pink-300" : "text-zinc-400"}`}>
                {DAYS[dayIdx]}
              </span>
              <span className={`text-xs mt-1 ${isSelected ? "text-pink-200" : "text-zinc-500"}`}>
                {formatDate(date)}
              </span>
              {isSelected && (
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pink-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Sessions */}
      <div className="mt-8 space-y-5">
        {selectedSessions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay sesiones para este día.</p>
        ) : (
          selectedSessions.map((session) => (
            <div key={session.id} className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    {session.start_time && (
                      <span className="text-xs text-zinc-500 uppercase tracking-wide">
                        🕒 {session.start_time}{session.end_time ? ` - ${session.end_time}` : ""}
                      </span>
                    )}
                    {session.stage && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">
                        🎪 {session.stage}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black">{session.title}</h3>
                  {session.artist && (
                    <p className="mt-2 text-zinc-300">🎧 {session.artist}</p>
                  )}
                  {session.description && (
                    <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{session.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}