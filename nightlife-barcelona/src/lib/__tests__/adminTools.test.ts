import { describe, expect, it } from "vitest"
import { ESSENTIAL_AREAS_BY_CITY, NEW_ESSENTIAL_CATS_BY_CITY, OSM_AREAS_BY_CITY, firstAreaOf, isAreaOfCity, isCategoryOfCity, toolsOfCity } from "../adminTools"
import { TILE_AREAS, TILE_ONLY_AREAS } from "../osmTiles"

describe("zonas por ciudad", () => {
  it("las zonas de Madrid existen en el importador (se recorren por cuadrículas)", () => {
    const known = new Set([...Object.keys(TILE_AREAS), ...Object.keys(TILE_ONLY_AREAS)])
    for (const [value] of OSM_AREAS_BY_CITY.madrid) expect(known.has(value)).toBe(true)
    expect(OSM_AREAS_BY_CITY.madrid.map(([v]) => v)).toEqual(["madrid1", "madrid2"])
  })
  it("las zonas de «Importar lo que falta» son las mismas que las del desplegable, en el mismo orden", () => {
    for (const city of ["barcelona", "madrid"] as const) {
      expect(ESSENTIAL_AREAS_BY_CITY[city].map(([v]) => v)).toEqual(OSM_AREAS_BY_CITY[city].map(([v]) => v))
    }
  })
  it("Barcelona conserva sus 10 zonas de siempre", () => {
    expect(OSM_AREAS_BY_CITY.barcelona).toHaveLength(10)
    expect(firstAreaOf("barcelona")).toBe("barcelona")
    expect(firstAreaOf("madrid")).toBe("madrid1")
  })
  it("una zona es de una sola ciudad", () => {
    expect(isAreaOfCity("madrid2", "madrid")).toBe(true)
    expect(isAreaOfCity("madrid2", "barcelona")).toBe(false)
    expect(isAreaOfCity("badalona", "madrid")).toBe(false)
  })
})

describe("categorías por ciudad", () => {
  it("Bicing y parking solo en Barcelona; BiciMAD y los estancos solo en Madrid; el resto en las dos", () => {
    expect(isCategoryOfCity("bicing", "barcelona")).toBe(true)
    expect(isCategoryOfCity("bicing", "madrid")).toBe(false)
    expect(isCategoryOfCity("parking", "madrid")).toBe(false)
    expect(isCategoryOfCity("bicimad", "madrid")).toBe(true)
    expect(isCategoryOfCity("bicimad", "barcelona")).toBe(false)
    expect(isCategoryOfCity("tobacco", "madrid")).toBe(true)
    expect(isCategoryOfCity("tobacco", "barcelona")).toBe(false)
    for (const c of ["all", "pharmacy", "atm", "taxi", "police", "hospital"]) {
      expect(isCategoryOfCity(c, "barcelona")).toBe(true)
      expect(isCategoryOfCity(c, "madrid")).toBe(true)
    }
  })
  it("«Importar lo que falta» no lleva categorías de la otra ciudad", () => {
    for (const city of ["barcelona", "madrid"] as const) {
      for (const [cat] of NEW_ESSENTIAL_CATS_BY_CITY[city]) expect(isCategoryOfCity(cat, city)).toBe(true)
    }
    expect(NEW_ESSENTIAL_CATS_BY_CITY.barcelona).toHaveLength(7)
    expect(NEW_ESSENTIAL_CATS_BY_CITY.barcelona.map(([c]) => c)).not.toContain("tobacco")
    expect(NEW_ESSENTIAL_CATS_BY_CITY.madrid.map(([c]) => c)).toContain("tobacco")
  })
})

describe("toolsOfCity", () => {
  const tools = [{ key: "a" }, { key: "b", city: "barcelona" as const }, { key: "c", city: "madrid" as const }]
  it("deja las comunes y las de la ciudad", () => {
    expect(toolsOfCity(tools, "barcelona").map((t) => t.key)).toEqual(["a", "b"])
    expect(toolsOfCity(tools, "madrid").map((t) => t.key)).toEqual(["a", "c"])
  })
})
