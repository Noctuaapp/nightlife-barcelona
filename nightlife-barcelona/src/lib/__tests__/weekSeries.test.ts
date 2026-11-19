import { describe, expect, it } from "vitest"
import { weekSeries } from "../weekSeries"
import { shiftIsoDay } from "../madridDay"

const days = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]
const prevDays = ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]

describe("weekSeries", () => {
  it("termina siempre en hoy, aunque hoy no tenga filas (a las 00:10 aún no hay visitas del día 20)", () => {
    const cur = [{ d: "2026-11-18", n: 5 }, { d: "2026-11-19", n: 49 }]
    const s = weekSeries(days, prevDays, cur, [], true, (r) => r.n)
    expect(s).toHaveLength(7)
    expect(s[6]).toEqual({ d: "2026-11-20", v: 0, prev: 0 })
    expect(s[5].v).toBe(49)
  })
  it("empareja la semana anterior por fecha, no por posición", () => {
    // Faltan varios días de la semana anterior: antes la marca del 19 salía del 1.er día que hubiera, no del 12.
    const cur = [{ d: "2026-11-19", n: 49 }]
    const prev = [{ d: "2026-11-12", n: 42 }]
    const s = weekSeries(days, prevDays, cur, prev, true, (r) => r.n)
    expect(s[5]).toEqual({ d: "2026-11-19", v: 49, prev: 42 })
    expect(s[0].prev).toBe(0)
  })
  it("sin semana anterior cargada no hay marca", () => {
    expect(weekSeries(days, prevDays, [], null, false, () => 1).every((p) => p.prev === null)).toBe(true)
  })
})

describe("shiftIsoDay", () => {
  it("mueve días de calendario, también por encima del cambio de mes y de hora", () => {
    expect(shiftIsoDay("2026-11-20", -6)).toBe("2026-11-14")
    expect(shiftIsoDay("2026-10-31", 1)).toBe("2026-11-01")
    expect(shiftIsoDay("2026-03-28", 2)).toBe("2026-03-30")
  })
})
