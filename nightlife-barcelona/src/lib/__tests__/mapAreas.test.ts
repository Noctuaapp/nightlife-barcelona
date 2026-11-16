import { describe, expect, it } from "vitest"
import { areaOf, areasPresent } from "../zones"

// Áreas del selector del mapa (16/11/2026): en Madrid, el selector no salía porque todos los locales eran «Madrid» (una sola zona).
describe("áreas del selector del mapa", () => {
  const madrid = [
    { city: "Madrid", neighborhood: "Malasaña" },
    { city: "Madrid", neighborhood: "Malasaña" },
    { city: "Madrid", neighborhood: "Chueca" },
    { city: "Madrid", neighborhood: "Madrid" },
    { city: "Madrid", neighborhood: null },
  ]

  it("en Madrid cada barrio es un área, con los de más sitios primero, y hay más de una (el selector sale)", () => {
    const areas = areasPresent(madrid, "madrid")
    expect(areas.length).toBeGreaterThan(1)
    expect(areas[0]).toEqual({ name: "Malasaña", n: 2 })
    expect(areas.map((a) => a.name)).toContain("Chueca")
    // «Madrid» a secas (sin barrio concreto) va el último, aunque tenga tantos sitios como el primero.
    expect(areas.at(-1)?.name).toBe("Madrid")
  })

  it("en Madrid, los locales sin barrio concreto quedan en «Madrid»", () => {
    expect(areaOf({ city: "Madrid", neighborhood: null }, "madrid")).toBe("Madrid")
    expect(areaOf({ city: "Madrid", neighborhood: "  " }, "madrid")).toBe("Madrid")
    expect(areasPresent(madrid, "madrid").find((a) => a.name === "Madrid")?.n).toBe(2)
  })

  it("en Barcelona sigue siendo el municipio de siempre, en el orden de siempre", () => {
    const bcn = [
      { city: "Barcelona", neighborhood: "Gràcia" },
      { city: "L'Hospitalet de Llobregat", neighborhood: "Centre" },
      { city: "Barcelona", neighborhood: "El Born" },
    ]
    expect(areaOf(bcn[0], "barcelona")).toBe("Barcelona")
    expect(areaOf(bcn[1], "barcelona")).toBe("L'Hospitalet de Llobregat")
    expect(areasPresent(bcn, "barcelona")).toEqual([
      { name: "Barcelona", n: 2 },
      { name: "L'Hospitalet de Llobregat", n: 1 },
    ])
  })
})
