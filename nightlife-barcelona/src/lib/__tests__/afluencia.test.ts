import { describe, expect, it } from "vitest"
import { extremes, fmtNum, niceMax, reliability, slotsFor, type AfluenciaMetric } from "../afluencia"

const metric = (over: Partial<AfluenciaMetric> = {}): AfluenciaMetric => ({
  first: "2026-09-01",
  total: 100,
  nights: 60,
  dow: [
    { k: 5, total: 30, nights: 9 },
    { k: 6, total: 90, nights: 9 },
    { k: 2, total: 5, nights: 8 },
  ],
  dom: [],
  month: [],
  ...over,
})

describe("slotsFor", () => {
  it("siempre devuelve los 7 / 12 / 31 huecos y marca como sin datos los que no se han visto", () => {
    const m = metric()
    expect(slotsFor("dow", m, "avg")).toHaveLength(7)
    expect(slotsFor("month", m, "avg")).toHaveLength(12)
    expect(slotsFor("dom", m, "avg")).toHaveLength(31)
    expect(slotsFor("dow", m, "avg").find((s) => s.k === 1)?.value).toBeNull()
  })
  it("media por noche frente a total", () => {
    const m = metric()
    const sat = (mode: "avg" | "total") => slotsFor("dow", m, mode).find((s) => s.k === 6)!
    expect(sat("avg").value).toBe(10)
    expect(sat("total").value).toBe(90)
    expect(sat("avg").label).toBe("Sáb")
    expect(sat("avg").long).toBe("Sábado")
  })
  it("sin datos: todo null", () => {
    expect(slotsFor("dow", null, "avg").every((s) => s.value === null)).toBe(true)
  })
})

describe("extremes", () => {
  it("el que más y el que menos entre los observados (ignora los sin datos)", () => {
    const e = extremes(slotsFor("dow", metric(), "avg"))
    expect(e?.max.long).toBe("Sábado")
    expect(e?.min.long).toBe("Martes")
  })
  it("con la media, un día visto pocas veces no pierde por tener menos noches", () => {
    const m = metric({ dow: [{ k: 6, total: 20, nights: 2 }, { k: 5, total: 30, nights: 6 }] })
    expect(extremes(slotsFor("dow", m, "avg"))?.max.long).toBe("Sábado")
    expect(extremes(slotsFor("dow", m, "total"))?.max.long).toBe("Viernes")
  })
  it("no inventa ganador si no hay de qué comparar", () => {
    expect(extremes(slotsFor("dow", metric({ dow: [{ k: 6, total: 9, nights: 3 }] }), "avg"))).toBeNull()
    expect(extremes(slotsFor("dow", metric({ dow: [{ k: 6, total: 0, nights: 3 }, { k: 5, total: 0, nights: 3 }] }), "avg"))).toBeNull()
    expect(extremes(slotsFor("dow", metric({ dow: [{ k: 6, total: 6, nights: 3 }, { k: 5, total: 4, nights: 2 }] }), "avg"))).toBeNull()
  })
})

describe("reliability", () => {
  it("sin datos", () => {
    expect(reliability("dow", null)).toBe("none")
    expect(reliability("dow", metric({ total: 0 }))).toBe("none")
  })
  it("día de la semana: depende de la vez que menos se ha visto un día", () => {
    expect(reliability("dow", metric())).toBe("mid") // mínimo 8
    expect(reliability("dow", metric({ dow: [{ k: 1, total: 1, nights: 3 }] }))).toBe("low")
    expect(reliability("dow", metric({ dow: [{ k: 1, total: 1, nights: 20 }, { k: 2, total: 1, nights: 17 }] }))).toBe("ok")
  })
  it("día del mes: depende de cuántos meses hay", () => {
    expect(reliability("dom", metric({ dom: [{ k: 1, total: 1, nights: 2 }] }))).toBe("low")
    expect(reliability("dom", metric({ dom: [{ k: 1, total: 1, nights: 4 }] }))).toBe("mid")
    expect(reliability("dom", metric({ dom: [{ k: 1, total: 1, nights: 7 }] }))).toBe("ok")
  })
  it("mes: hace falta casi un año y, aun así, es orientativo", () => {
    expect(reliability("month", metric({ nights: 100 }))).toBe("low")
    expect(reliability("month", metric({ nights: 365 }))).toBe("mid")
    expect(reliability("month", metric({ nights: 700 }))).toBe("ok")
  })
})

describe("formato y eje", () => {
  it("fmtNum", () => {
    expect(fmtNum(null)).toBe("—")
    expect(fmtNum(4.25)).toBe("4,3")
    expect(fmtNum(10)).toBe("10")
  })
  it("niceMax", () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(0.7)).toBe(1)
    expect(niceMax(1.4)).toBe(2)
    expect(niceMax(3.2)).toBe(5)
    expect(niceMax(7)).toBe(10)
    expect(niceMax(42)).toBe(50)
    expect(niceMax(120)).toBe(200)
  })
})
