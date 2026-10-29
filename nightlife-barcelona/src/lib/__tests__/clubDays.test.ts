import { describe, it, expect } from "vitest"
import { clubMatchesDay, tonightDow, WEEK_DOW_ORDER } from "../clubDays"

const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0

describe("tonightDow", () => {
  it("de día y de noche es el mismo día", () => {
    expect(tonightDow(FRI, 12 * 60)).toBe(FRI)
    expect(tonightDow(FRI, 23 * 60)).toBe(FRI)
  })
  it("de madrugada (antes de las 6:00) sigue siendo la noche del día anterior", () => {
    expect(tonightDow(SAT, 2 * 60)).toBe(FRI)
    expect(tonightDow(SUN, 3 * 60)).toBe(SAT)
    expect(tonightDow(MON, 5 * 60 + 59)).toBe(SUN)
  })
  it("a las 6:00 ya es el día nuevo", () => {
    expect(tonightDow(MON, 6 * 60)).toBe(MON)
  })
})

describe("WEEK_DOW_ORDER", () => {
  it("empieza en lunes, acaba en domingo y tiene los 7 días", () => {
    expect(WEEK_DOW_ORDER[0]).toBe(MON)
    expect(WEEK_DOW_ORDER[6]).toBe(SUN)
    expect([...WEEK_DOW_ORDER].sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe("clubMatchesDay", () => {
  it("sin día elegido pasa todo, incluso sin horario", () => {
    expect(clubMatchesDay("", null, null)).toBe(true)
    expect(clubMatchesDay(null, undefined, null)).toBe(true)
    expect(clubMatchesDay("V/S 23:00-06:00", null, null)).toBe(true)
  })

  it("horario sin días y sin días de apertura: abre todos los días", () => {
    for (const d of WEEK_DOW_ORDER) expect(clubMatchesDay("23:55-06:00", null, d)).toBe(true)
  })

  it("usa los días de apertura del admin", () => {
    expect(clubMatchesDay("23:55-06:00", ["Vie", "Sáb"], FRI)).toBe(true)
    expect(clubMatchesDay("23:55-06:00", ["Vie", "Sáb"], SAT)).toBe(true)
    expect(clubMatchesDay("23:55-06:00", ["Vie", "Sáb"], MON)).toBe(false)
    expect(clubMatchesDay("23:55-06:00", ["Vie", "Sáb"], SUN)).toBe(false)
  })

  it("los días de apertura mandan sobre los días del horario", () => {
    expect(clubMatchesDay("L/M/X 23:00-06:00", ["Jue"], THU)).toBe(true)
    expect(clubMatchesDay("L/M/X 23:00-06:00", ["Jue"], MON)).toBe(false)
  })

  it("horario con días sueltos", () => {
    expect(clubMatchesDay("V/S 23:00-06:00", null, FRI)).toBe(true)
    expect(clubMatchesDay("V/S 23:00-06:00", null, SAT)).toBe(true)
    expect(clubMatchesDay("V/S 23:00-06:00", null, THU)).toBe(false)
    expect(clubMatchesDay("V/S 23:00-06:00", null, SUN)).toBe(false)
  })

  it("varias franjas separadas por coma", () => {
    const h = "L/M/X 23:00-06:00, V/S 23:00-07:00"
    expect(clubMatchesDay(h, null, MON)).toBe(true)
    expect(clubMatchesDay(h, null, WED)).toBe(true)
    expect(clubMatchesDay(h, null, FRI)).toBe(true)
    expect(clubMatchesDay(h, null, THU)).toBe(false)
    expect(clubMatchesDay(h, null, SUN)).toBe(false)
  })

  it("rangos de días y separador |", () => {
    const h = "J-S 00:00-06:00 | D 19:00-01:00"
    expect(clubMatchesDay(h, null, THU)).toBe(true)
    expect(clubMatchesDay(h, null, SAT)).toBe(true)
    expect(clubMatchesDay(h, null, SUN)).toBe(true)
    expect(clubMatchesDay(h, null, MON)).toBe(false)
    expect(clubMatchesDay(h, null, TUE)).toBe(false)
  })

  it("con día elegido, un club sin horario o con horario ilegible no pasa", () => {
    expect(clubMatchesDay("", null, FRI)).toBe(false)
    expect(clubMatchesDay(null, null, FRI)).toBe(false)
    expect(clubMatchesDay("consultar", null, FRI)).toBe(false)
  })

  it("sin horario pero con días de apertura sí se sabe", () => {
    expect(clubMatchesDay("", ["Sáb"], SAT)).toBe(true)
    expect(clubMatchesDay("", ["Sáb"], FRI)).toBe(false)
  })
})
