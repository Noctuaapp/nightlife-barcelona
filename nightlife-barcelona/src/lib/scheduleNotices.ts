// Avisos de cierre y horarios especiales de un club (30/10/2026). Los publica el dueño desde
// «Mi club» y se guardan en la columna clubs.schedule_notices (jsonb, ver supabase/60).
//
//   closed → «Hoy cerramos» / «Cerramos el sáb 8 nov» / «Cerrado del 24 al 26 dic»
//   hours  → «Hoy abrimos de 20:00 a 02:00» (horario distinto del habitual)
//   notice → un aviso libre con fechas («Obras en la entrada hasta el viernes»)
//
// Las fechas son noches, no días de calendario: de madrugada (antes de las 06:00, hora de Madrid)
// sigue siendo la noche anterior, igual que en lib/clubHours.ts. Así, «cerrado el sábado» sigue
// valiendo a las 02:00 del domingo.
import { clubHoursStatus, clubOpenNow, type HoursStatus } from "./clubHours"
import { madridIsoDay } from "./madridDay"

export type NoticeKind = "closed" | "hours" | "notice"

export type ScheduleNotice = {
  id: string
  kind: NoticeKind
  from: string // AAAA-MM-DD (primera noche)
  to: string // AAAA-MM-DD (última noche; igual que from si es una sola)
  open?: string // HH:MM, solo en «hours»
  close?: string // HH:MM, solo en «hours»
  note?: string // texto libre, máx. NOTE_MAX
}

export const MAX_NOTICES = 20
export const NOTE_MAX = 140

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const KINDS: NoticeKind[] = ["closed", "hours", "notice"]

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// La «noche» en la que estamos ahora (AAAA-MM-DD, hora de Madrid; antes de las 06:00 = la anterior).
export function nightDay(now: Date = new Date()): string {
  const hour =
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(now)) % 24
  const day = madridIsoDay(now)
  return hour < 6 ? addDays(day, -1) : day
}

// Lo que llega de la base de datos es un jsonb cualquiera: solo se aceptan avisos bien formados.
export function parseNotices(raw: unknown): ScheduleNotice[] {
  if (!Array.isArray(raw)) return []
  const out: ScheduleNotice[] = []
  for (const r of raw) {
    if (!r || typeof r !== "object") continue
    const o = r as Record<string, unknown>
    const kind = o.kind as NoticeKind
    if (!KINDS.includes(kind)) continue
    const from = typeof o.from === "string" && ISO_DAY.test(o.from) ? o.from : null
    if (!from) continue
    let to = typeof o.to === "string" && ISO_DAY.test(o.to) ? o.to : from
    if (to < from) to = from
    const n: ScheduleNotice = { id: typeof o.id === "string" && o.id ? o.id.slice(0, 40) : `${kind}-${from}`, kind, from, to }
    if (kind === "hours") {
      if (typeof o.open !== "string" || typeof o.close !== "string" || !HHMM.test(o.open) || !HHMM.test(o.close)) continue
      n.open = o.open
      n.close = o.close
    }
    if (typeof o.note === "string" && o.note.trim()) n.note = o.note.trim().slice(0, NOTE_MAX)
    if (kind === "notice" && !n.note) continue
    out.push(n)
    if (out.length >= MAX_NOTICES) break
  }
  return out.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
}

// Los que valen esta noche.
export function activeNotices(raw: unknown, day: string = nightDay()): ScheduleNotice[] {
  return parseNotices(raw).filter((n) => n.from <= day && day <= n.to)
}

// Los que empiezan en los próximos `horizon` días (solo cierres y horarios; un aviso libre no se anuncia antes).
export function upcomingNotices(raw: unknown, day: string = nightDay(), horizon = 14): ScheduleNotice[] {
  const limit = addDays(day, horizon)
  return parseNotices(raw).filter((n) => n.kind !== "notice" && n.from > day && n.from <= limit)
}

// Para guardar: se quitan los ya pasados.
export function pruneNotices(raw: unknown, day: string = nightDay()): ScheduleNotice[] {
  return parseNotices(raw).filter((n) => n.to >= day)
}

export function isClosedTonight(raw: unknown, now: Date = new Date()): boolean {
  return activeNotices(raw, nightDay(now)).some((n) => n.kind === "closed")
}

type HoursClub = {
  hours?: string | null
  open_days?: string[] | null
  temporarily_closed?: boolean | null
  schedule_notices?: unknown
}

// ¿Está abierto ahora, teniendo en cuenta cierre temporal, cierre de esta noche y horario especial?
// null = no se sabe (igual que clubOpenNow).
export function effectiveOpenNow(club: HoursClub): boolean | null {
  if (club.temporarily_closed) return false
  const active = activeNotices(club.schedule_notices)
  if (active.some((n) => n.kind === "closed")) return false
  const special = active.find((n) => n.kind === "hours" && n.open && n.close)
  if (special) return clubOpenNow(`${special.open}-${special.close}`, null)
  return clubOpenNow(club.hours, club.open_days)
}

// Lo mismo para la hora: «cierra a las 06:00» / «abre a las 23:55». null = no se sabe (cierre
// temporal o de esta noche, o sin horario interpretable).
export function effectiveHoursStatus(club: HoursClub): HoursStatus | null {
  if (club.temporarily_closed) return null
  const active = activeNotices(club.schedule_notices)
  if (active.some((n) => n.kind === "closed")) return null
  const special = active.find((n) => n.kind === "hours" && n.open && n.close)
  if (special) return clubHoursStatus(`${special.open}-${special.close}`, null)
  return clubHoursStatus(club.hours, club.open_days)
}
