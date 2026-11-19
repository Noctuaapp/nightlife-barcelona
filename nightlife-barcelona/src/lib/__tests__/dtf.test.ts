import { describe, expect, it } from "vitest"
import { lazyDtf } from "../dtf"
import { madridIsoDay } from "../madridDay"
import { madridClock } from "../clubHours"
import { nightDay } from "../scheduleNotices"
import { nightDateMadrid } from "../homeEvents"

// 19/11/2026: los formateadores de fecha se crean una sola vez. Estos tests comprueban que el resultado es el de siempre.
describe("formateadores de fecha reutilizados", () => {
  it("lazyDtf crea el formateador una sola vez", () => {
    const f = lazyDtf("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false })
    expect(f()).toBe(f())
  })

  it("madridIsoDay da lo mismo que toLocaleDateString('sv-SE') en todas las horas, incluidos los cambios de hora", () => {
    for (const start of [Date.UTC(2026, 2, 28, 0, 0), Date.UTC(2026, 9, 24, 0, 0), Date.UTC(2026, 11, 31, 20, 0), Date.UTC(2027, 0, 1, 0, 0)]) {
      for (let h = 0; h < 72; h++) {
        const d = new Date(start + h * 3600_000)
        expect(madridIsoDay(d)).toBe(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }))
      }
    }
  })

  it("nightDateMadrid y nightDay: antes de las 6:00 todavía es la noche de ayer", () => {
    // 2 de la madrugada del sábado 21/11/2026 en Madrid (UTC+1) = 01:00 UTC
    const d = new Date(Date.UTC(2026, 10, 21, 1, 0))
    expect(nightDateMadrid(d)).toBe("2026-11-20")
    expect(nightDay(d)).toBe("2026-11-20")
    const noon = new Date(Date.UTC(2026, 10, 21, 11, 0))
    expect(nightDateMadrid(noon)).toBe("2026-11-21")
    expect(nightDay(noon)).toBe("2026-11-21")
  })

  it("madridClock devuelve día y minutos de Madrid", () => {
    const { dow, minutes } = madridClock()
    expect(dow).toBeGreaterThanOrEqual(0)
    expect(dow).toBeLessThanOrEqual(6)
    expect(minutes).toBeGreaterThanOrEqual(0)
    expect(minutes).toBeLessThan(1440)
  })
})
