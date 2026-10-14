import { describe, it, expect, afterEach, vi } from "vitest"
import { clubOpenNow, clubOpensOn } from "../clubHours"

// Octubre 2026 en Madrid es UTC+2. Viernes 16/10/2026 23:30 Madrid = 21:30 UTC.
const at = (iso: string) => vi.setSystemTime(new Date(iso))
afterEach(() => vi.useRealTimers())

describe("clubOpenNow", () => {
  it("horario sin días", () => {
    vi.useFakeTimers()
    at("2026-10-16T21:30:00Z") // viernes 23:30
    expect(clubOpenNow("23:00-06:00")).toBe(true)
    expect(clubOpenNow("23:55-06:00")).toBe(false)
  })
  it("la madrugada pertenece a la noche anterior (open_days)", () => {
    vi.useFakeTimers()
    at("2026-10-17T01:00:00Z") // sábado 03:00 → noche del viernes
    expect(clubOpenNow("00:00-06:00", ["Vie"])).toBe(true)
    expect(clubOpenNow("00:00-06:00", ["Sáb"])).toBe(false)
  })
  it("horario por días con rango que cruza medianoche", () => {
    vi.useFakeTimers()
    at("2026-10-18T00:00:00Z") // domingo 02:00 → sigue la noche del sábado
    expect(clubOpenNow("V/S 23:00-06:00")).toBe(true)
    expect(clubOpenNow("L-J 23:00-03:00")).toBe(false)
  })
  it("devuelve null si no entiende el texto", () => {
    expect(clubOpenNow("Consultar")).toBe(null)
    expect(clubOpenNow(null)).toBe(null)
  })
})

describe("clubOpensOn", () => {
  it("usa open_days si existen", () => {
    expect(clubOpensOn("23:00-06:00", ["Vie", "Sáb"], 5)).toBe(true)
    expect(clubOpensOn("23:00-06:00", ["Vie", "Sáb"], 2)).toBe(false)
  })
  it("usa los días del horario", () => {
    expect(clubOpensOn("V/S 23:00-06:00", null, 6)).toBe(true)
    expect(clubOpensOn("V/S 23:00-06:00", null, 3)).toBe(false)
  })
  it("sin días: abre todas las noches; sin datos: null", () => {
    expect(clubOpensOn("23:00-06:00", null, 1)).toBe(true)
    expect(clubOpensOn(null, null, 1)).toBe(null)
  })
})
