import { madridIsoDay } from "./madridDay"
import { rangeDays, type AdminRange } from "./adminRange"

// Estadísticas de «¿Qué preferirías?» por día para Admin › Encuestas (03/11/2026).
//
// Un voto es una fila de party_poll_votes (con cuenta) o de party_poll_anon_votes (sin cuenta).
// El día de un voto es el día de Madrid en que se emitió, igual que el resto del admin: un voto a las
// 00:30 de Barcelona cuenta para el día nuevo aunque en UTC todavía sea el anterior. En un mismo día
// pueden salir varias preguntas distintas (quien ya votó la de hoy recibe la siguiente, y sin cuenta
// no salen las de alcohol), así que cada día lleva su lista de preguntas con el recuento de cada una.

export type VoteRow = { poll_id: string; choice: number; created_at: string; anon: boolean }
export type PollTally = { pollId: string; a: number; b: number; total: number; anon: number; account: number }
export type DayTally = { day: string; total: number; anon: number; account: number; polls: PollTally[] }

export function tallyByDay(rows: VoteRow[], range: AdminRange): DayTally[] {
  const byDay = new Map<string, Map<string, PollTally>>()
  for (const r of rows) {
    if (r.choice !== 0 && r.choice !== 1) continue
    const ms = Date.parse(r.created_at)
    if (Number.isNaN(ms)) continue
    const day = madridIsoDay(new Date(ms))
    if (day < range.from || day > range.to) continue
    let polls = byDay.get(day)
    if (!polls) {
      polls = new Map()
      byDay.set(day, polls)
    }
    let t = polls.get(r.poll_id)
    if (!t) {
      t = { pollId: r.poll_id, a: 0, b: 0, total: 0, anon: 0, account: 0 }
      polls.set(r.poll_id, t)
    }
    if (r.choice === 0) t.a += 1
    else t.b += 1
    t.total += 1
    if (r.anon) t.anon += 1
    else t.account += 1
  }
  return Array.from(byDay, ([day, polls]) => {
    const list = Array.from(polls.values()).sort((x, y) => y.total - x.total || x.pollId.localeCompare(y.pollId))
    return {
      day,
      total: list.reduce((n, p) => n + p.total, 0),
      anon: list.reduce((n, p) => n + p.anon, 0),
      account: list.reduce((n, p) => n + p.account, 0),
      polls: list,
    }
  }).sort((x, y) => (x.day < y.day ? 1 : -1)) // el día más reciente primero
}

export type PollSummary = { votes: number; anon: number; account: number; daysWithVotes: number; daysInRange: number; avgPerDay: number }

export function summarizeDays(days: DayTally[], range: AdminRange): PollSummary {
  const votes = days.reduce((n, d) => n + d.total, 0)
  const anon = days.reduce((n, d) => n + d.anon, 0)
  const daysInRange = rangeDays(range)
  return {
    votes,
    anon,
    account: votes - anon,
    daysWithVotes: days.length,
    daysInRange,
    avgPerDay: daysInRange > 0 ? Math.round((votes / daysInRange) * 10) / 10 : 0,
  }
}

// Todos los días del rango, del más antiguo al más reciente, con 0 en los que no hay votos (para la gráfica).
export function votesPerDay(days: DayTally[], range: AdminRange): { day: string; total: number }[] {
  const known = new Map(days.map((d) => [d.day, d.total]))
  const out: { day: string; total: number }[] = []
  const end = new Date(`${range.to}T12:00:00Z`)
  for (let d = new Date(`${range.from}T12:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    out.push({ day, total: known.get(day) ?? 0 })
  }
  return out
}

export const percent = (n: number, total: number): number => (total > 0 ? Math.round((n / total) * 100) : 0)
