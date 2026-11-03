import { describe, expect, it } from "vitest"
import { percent, summarizeDays, tallyByDay, votesPerDay, type VoteRow } from "../pollStats"

const vote = (poll_id: string, choice: number, created_at: string, anon = false): VoteRow => ({ poll_id, choice, created_at, anon })
const range = { from: "2026-11-01", to: "2026-11-03" }

describe("tallyByDay", () => {
  it("agrupa por día de Madrid, no por día UTC", () => {
    // 23:30 UTC del 2 de noviembre ya es el 3 en Barcelona (UTC+1).
    const days = tallyByDay([vote("p1", 0, "2026-11-02T23:30:00Z"), vote("p1", 1, "2026-11-02T10:00:00Z")], range)
    expect(days.map((d) => [d.day, d.total])).toEqual([["2026-11-03", 1], ["2026-11-02", 1]])
  })

  it("cuenta cada opción, y los votos con y sin cuenta", () => {
    const days = tallyByDay(
      [
        vote("p1", 0, "2026-11-03T09:00:00Z"),
        vote("p1", 0, "2026-11-03T09:05:00Z", true),
        vote("p1", 1, "2026-11-03T09:10:00Z", true),
      ],
      range
    )
    expect(days).toHaveLength(1)
    expect(days[0].total).toBe(3)
    expect(days[0].anon).toBe(2)
    expect(days[0].account).toBe(1)
    expect(days[0].polls[0]).toEqual({ pollId: "p1", a: 2, b: 1, total: 3, anon: 2, account: 1 })
  })

  it("separa las preguntas de un mismo día y pone primero la más votada", () => {
    const days = tallyByDay(
      [vote("rara", 0, "2026-11-03T09:00:00Z"), vote("popular", 0, "2026-11-03T09:01:00Z"), vote("popular", 1, "2026-11-03T09:02:00Z")],
      range
    )
    expect(days[0].polls.map((p) => p.pollId)).toEqual(["popular", "rara"])
  })

  it("deja fuera lo que cae fuera del rango, las opciones raras y las fechas rotas", () => {
    const days = tallyByDay(
      [
        vote("p1", 0, "2026-10-31T12:00:00Z"),
        vote("p1", 0, "2026-11-04T12:00:00Z"),
        vote("p1", 2, "2026-11-02T12:00:00Z"),
        vote("p1", 0, "no es una fecha"),
        vote("p1", 1, "2026-11-02T12:00:00Z"),
      ],
      range
    )
    expect(days.map((d) => d.total)).toEqual([1])
  })

  it("ordena los días del más reciente al más antiguo", () => {
    const days = tallyByDay([vote("a", 0, "2026-11-01T12:00:00Z"), vote("a", 0, "2026-11-03T12:00:00Z"), vote("a", 0, "2026-11-02T12:00:00Z")], range)
    expect(days.map((d) => d.day)).toEqual(["2026-11-03", "2026-11-02", "2026-11-01"])
  })
})

describe("summarizeDays y votesPerDay", () => {
  it("resume el rango", () => {
    const days = tallyByDay([vote("a", 0, "2026-11-03T12:00:00Z", true), vote("a", 1, "2026-11-03T12:01:00Z"), vote("b", 0, "2026-11-01T12:00:00Z")], range)
    expect(summarizeDays(days, range)).toEqual({ votes: 3, anon: 1, account: 2, daysWithVotes: 2, daysInRange: 3, avgPerDay: 1 })
  })

  it("un rango sin votos no da error", () => {
    expect(summarizeDays([], range)).toEqual({ votes: 0, anon: 0, account: 0, daysWithVotes: 0, daysInRange: 3, avgPerDay: 0 })
  })

  it("la gráfica incluye los días sin votos, en orden", () => {
    const days = tallyByDay([vote("a", 0, "2026-11-03T12:00:00Z")], range)
    expect(votesPerDay(days, range)).toEqual([
      { day: "2026-11-01", total: 0 },
      { day: "2026-11-02", total: 0 },
      { day: "2026-11-03", total: 1 },
    ])
  })

  it("percent redondea y no divide por cero", () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(2, 3)).toBe(67)
    expect(percent(0, 0)).toBe(0)
  })
})
