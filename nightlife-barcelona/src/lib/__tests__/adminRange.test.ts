import { describe, it, expect } from "vitest"
import { normalizeRange, rangeDays, yearRange, yearsUpTo, ADMIN_RANGE_MAX_DAYS } from "../adminRange"

const TODAY = "2026-11-01"

describe("normalizeRange", () => {
  it("un día concreto es un rango de un día", () => {
    expect(normalizeRange("2026-10-18", "2026-10-18", TODAY)).toEqual({ from: "2026-10-18", to: "2026-10-18" })
    expect(rangeDays({ from: "2026-10-18", to: "2026-10-18" })).toBe(1)
  })

  it("si vienen al revés, se dan la vuelta", () => {
    expect(normalizeRange("2026-10-20", "2026-10-10", TODAY)).toEqual({ from: "2026-10-10", to: "2026-10-20" })
  })

  it("el futuro se recorta a hoy, y un rango entero en el futuro no vale", () => {
    expect(normalizeRange("2026-10-25", "2026-12-31", TODAY)).toEqual({ from: "2026-10-25", to: TODAY })
    expect(normalizeRange("2026-11-05", "2026-11-09", TODAY)).toBeNull()
  })

  it("no admite fechas inventadas ni mal escritas", () => {
    expect(normalizeRange("2026-02-30", "2026-03-01", TODAY)).toBeNull()
    expect(normalizeRange("18/10/2026", "2026-10-20", TODAY)).toBeNull()
    expect(normalizeRange("", "", TODAY)).toBeNull()
  })

  it("no baja del mínimo", () => {
    expect(normalizeRange("2020-01-01", "2025-01-10", TODAY)).toEqual({ from: "2025-01-01", to: "2025-01-10" })
    expect(normalizeRange("2020-01-01", "2020-02-01", TODAY)).toBeNull()
  })

  it("más de dos años seguidos no vale", () => {
    expect(normalizeRange("2025-01-01", TODAY, TODAY)).not.toBeNull()
    expect(rangeDays({ from: "2025-01-01", to: TODAY })).toBeLessThanOrEqual(ADMIN_RANGE_MAX_DAYS)
    expect(normalizeRange("2025-01-01", "2027-12-31", "2027-12-31")).toBeNull()
  })
})

describe("años", () => {
  it("lista los años desde el mínimo hasta el actual", () => {
    expect(yearsUpTo("2026-11-01")).toEqual([2025, 2026])
    expect(yearsUpTo("2027-03-01")).toEqual([2025, 2026, 2027])
  })

  it("el año actual llega hasta hoy; uno pasado, entero", () => {
    expect(yearRange(2026, TODAY)).toEqual({ from: "2026-01-01", to: TODAY })
    expect(yearRange(2025, TODAY)).toEqual({ from: "2025-01-01", to: "2025-12-31" })
  })
})
