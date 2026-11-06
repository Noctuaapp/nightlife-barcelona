import { describe, it, expect } from "vitest"
import { metroDot, metroDotCss, metroLinesOf } from "../metroMarker"
import { metroLineColor } from "../transitColors"

describe("chincheta de metro", () => {
  it("lee las líneas de la subcategoría, en mayúsculas y sin huecos", () => {
    expect(metroLinesOf("L1, l3 ,,L9")).toEqual(["L1", "L3", "L9"])
    expect(metroLinesOf(null)).toEqual([])
    expect(metroLinesOf("")).toEqual([])
  })

  it("estación de una sola línea: punto del color de la línea", () => {
    const d = metroDot("L3")
    expect(d.hub).toBe(false)
    expect(d.fill).toBe(metroLineColor("L3").bg)
    expect(d.color).toBe(metroLineColor("L3").bg)
  })

  it("transbordo: blanco con aro del color de la primera línea", () => {
    const d = metroDot("L4,L5")
    expect(d.hub).toBe(true)
    expect(d.fill).toBe("#ffffff")
    expect(d.color).toBe(metroLineColor("L4").bg)
  })

  it("con una línea filtrada, el aro del transbordo es el de esa línea", () => {
    expect(metroDot("L4,L5", "L5").color).toBe(metroLineColor("L5").bg)
    // Si la estación no tiene esa línea, vuelve a la primera.
    expect(metroDot("L4,L5", "L9").color).toBe(metroLineColor("L4").bg)
    expect(metroDot("L4,L5", "All").color).toBe(metroLineColor("L4").bg)
  })

  it("sin línea conocida usa el color de la marca y no rompe", () => {
    const d = metroDot("")
    expect(d.hub).toBe(false)
    expect(d.fill).toBe("#7c5cff")
  })

  it("el transbordo es más grande que una estación normal y el CSS no lleva transform ni letras", () => {
    const a = metroDot("L1")
    const b = metroDot("L1,L3")
    expect(b.size + b.border * 2).toBeGreaterThan(a.size + a.border * 2)
    expect(metroDotCss(a)).not.toMatch(/transform/)
  })
})
