import { describe, expect, it } from "vitest"
import { ESSENTIAL_CATEGORIES, NOT_ON_MAP, isOnMap } from "../essentialCategories"

// El mapa no enseña paradas de taxi ni de VTC, ni en Barcelona ni en Madrid (16/11/2026).
describe("categorías que salen en el mapa", () => {
  it("Taxi no sale", () => {
    expect(isOnMap("Taxi")).toBe(false)
    expect(NOT_ON_MAP).toContain("Taxi")
  })

  it("el resto de categorías sí salen", () => {
    for (const c of ESSENTIAL_CATEGORIES) {
      if (c.key === "Taxi") continue
      expect(isOnMap(c.key), c.key).toBe(true)
    }
  })

  it("lo que no es una categoría no rompe (sin categoría, vacío)", () => {
    expect(isOnMap(null)).toBe(true)
    expect(isOnMap(undefined)).toBe(true)
    expect(isOnMap("")).toBe(true)
  })

  it("solo se excluyen categorías que existen en el catálogo", () => {
    const keys = new Set(ESSENTIAL_CATEGORIES.map((c) => c.key))
    for (const k of NOT_ON_MAP) expect(keys.has(k), k).toBe(true)
  })
})
