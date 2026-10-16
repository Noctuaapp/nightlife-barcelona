"use client"

import { useState } from "react"
import { Clock, Headphones, MapPin, Ticket, Plus, Trash2 } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { useIsAdmin } from "../../lib/useIsAdmin"
import { supabase } from "../../lib/supabase"
import { toast } from "../ui/Toast"
import { InlineEditText } from "../admin/InlineEdit"

// Programa de un festival de varios días: pestañas por fecha y sesiones de ese día, cada una con
// su propio precio (un festival de 2 días puede costar distinto el viernes que el sábado — el
// pack combinado de los dos días se edita aparte, en price_tiers, ver InlineEditTiers).
// El admin puede añadir, editar y quitar sesiones aquí mismo, sin pasar por /mi-festival.
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
  price: string | null
}

const emptyNewSession = { date: "", title: "" }

export default function EventSessionsCalendar({ sessions, eventId }: { sessions: Session[]; eventName?: string; eventId: number }) {
  const { t, locale } = useLanguage()
  const isAdmin = useIsAdmin()
  // La ficha es ISR: tras añadir/quitar una sesión se enseña ya mismo el resultado, sin esperar a
  // que la página vuelva a generarse (ver la misma solución en InlineEdit.tsx y ClubGallery.tsx).
  const [sessionsOverride, setSessionsOverride] = useState<Session[] | null>(null)
  const [newSession, setNewSession] = useState(emptyNewSession)
  const [adding, setAdding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const list = sessionsOverride ?? sessions
  const byDay: Record<string, Session[]> = {}
  list.forEach((s) => {
    if (s.date) (byDay[s.date] ||= []).push(s)
  })
  const dates = Object.keys(byDay).sort()
  const [selected, setSelected] = useState<string>(dates[0] || "")
  const activeDate = dates.includes(selected) ? selected : dates[0] || ""
  const dayList = (byDay[activeDate] || []).slice().sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00`).toLocaleDateString(toDateLocale(locale), o)

  if (list.length === 0 && !isAdmin) return null

  const addSession = async () => {
    if (!newSession.title.trim() || !newSession.date) {
      toast("Pon la fecha y el título de la sesión")
      return
    }
    setAdding(true)
    const { data, error } = await supabase
      .from("event_sessions")
      .insert({ event_id: eventId, date: newSession.date, title: newSession.title.trim() })
      .select()
      .single()
    setAdding(false)
    if (error) {
      toast("No se pudo añadir: " + error.message)
      return
    }
    if (data) {
      setSessionsOverride([...list, data])
      setSelected(data.date)
    }
    setNewSession(emptyNewSession)
  }

  const removeSession = async (id: number) => {
    if (pendingDelete !== id) {
      setPendingDelete(id)
      return
    }
    setPendingDelete(null)
    const { error } = await supabase.from("event_sessions").delete().eq("id", id)
    if (error) {
      toast("No se pudo quitar: " + error.message)
      return
    }
    setSessionsOverride(list.filter((s) => s.id !== id))
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-ink">{t("eventSessions.title")}</h2>

      {dates.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]" role="tablist">
          {dates.map((date) => {
            const active = activeDate === date
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
      )}

      <ul className="mt-4 space-y-2">
        {dayList.length === 0 ? (
          <li className="text-sm text-zinc-400">{t("eventSessions.none")}</li>
        ) : (
          dayList.map((s) => (
            <li key={s.id} className="rounded-ctl border border-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  {(s.start_time || isAdmin) && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      <InlineEditText table="event_sessions" id={s.id} field="start_time" value={s.start_time} placeholder="22:00" emptyLabel="hora" />
                      {(s.end_time || isAdmin) && (
                        <>
                          –<InlineEditText table="event_sessions" id={s.id} field="end_time" value={s.end_time} placeholder="04:00" emptyLabel="hora fin" />
                        </>
                      )}
                    </span>
                  )}
                  {(s.stage || isAdmin) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      <InlineEditText table="event_sessions" id={s.id} field="stage" value={s.stage} emptyLabel="escenario" />
                    </span>
                  )}
                  {(s.price || isAdmin) && (
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      <Ticket size={12} />
                      <InlineEditText table="event_sessions" id={s.id} field="price" value={s.price} placeholder="35 €" emptyLabel="precio" />
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => removeSession(s.id)}
                    className={`shrink-0 rounded-full p-1.5 transition ${pendingDelete === s.id ? "bg-red-500 text-white" : "text-zinc-400 hover:bg-red-500/10 hover:text-red-300"}`}
                    aria-label="Quitar sesión"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <h3 className="mt-1 text-base font-semibold text-ink">
                <InlineEditText table="event_sessions" id={s.id} field="title" value={s.title} />
              </h3>
              {(s.artist || isAdmin) && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
                  <Headphones size={14} className="text-brand-soft" />
                  <InlineEditText table="event_sessions" id={s.id} field="artist" value={s.artist} emptyLabel="añadir artista" />
                </p>
              )}
              <p className="mt-1.5 text-sm text-zinc-400 empty:hidden">
                <InlineEditText table="event_sessions" id={s.id} field="description" value={s.description} multiline emptyLabel="añadir descripción" />
              </p>
            </li>
          ))
        )}
      </ul>

      {isAdmin && (
        <div className="mt-4 grid gap-2 rounded-ctl border border-dashed border-purple-400/30 p-3 sm:grid-cols-[auto_1fr_auto]">
          <input
            type="date"
            value={newSession.date}
            onChange={(e) => setNewSession((f) => ({ ...f, date: e.target.value }))}
            style={{ colorScheme: "dark" }}
            className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-ink outline-none focus:border-purple-400"
          />
          <input
            value={newSession.title}
            onChange={(e) => setNewSession((f) => ({ ...f, title: e.target.value }))}
            placeholder="Título de la sesión (ej. Día 1 — Techno Stage)"
            className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-ink outline-none focus:border-purple-400"
          />
          <button
            onClick={addSession}
            disabled={adding}
            className="flex items-center justify-center gap-1.5 rounded-md bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:opacity-50"
          >
            <Plus size={14} /> {adding ? "Añadiendo…" : "Añadir sesión"}
          </button>
        </div>
      )}
    </div>
  )
}
