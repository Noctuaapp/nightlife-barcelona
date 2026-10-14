import { describe, it, expect } from "vitest"
import { STYLES, clubsForStyle, neighborhoodsOf, styleBySlug } from "../areas"

const clubs = [
  { id: 1, name: "A", music: "Reggaetón, Comercial", neighborhood: "El Born" },
  { id: 2, name: "B", music: "Techno, House", neighborhood: "El Born" },
  { id: 3, name: "C", music: "Indie, Rock", neighborhood: "Gràcia" },
  { id: 4, name: "D", music: null, neighborhood: "" },
]

describe("estilos", () => {
  it("encuentra los estilos en español", () => {
    expect(clubsForStyle(clubs, styleBySlug("reggaeton")!).map((c) => c.id)).toEqual([1])
    expect(clubsForStyle(clubs, styleBySlug("comercial")!).map((c) => c.id)).toEqual([1])
    expect(clubsForStyle(clubs, styleBySlug("electronica")!).map((c) => c.id)).toEqual([2])
    expect(clubsForStyle(clubs, styleBySlug("rock-indie")!).map((c) => c.id)).toEqual([3])
  })
  it("todos los slugs son únicos", () => {
    expect(new Set(STYLES.map((s) => s.slug)).size).toBe(STYLES.length)
  })
})

describe("neighborhoodsOf", () => {
  it("cuenta por barrio y genera el slug", () => {
    expect(neighborhoodsOf(clubs)).toEqual([
      { slug: "el-born", name: "El Born", count: 2 },
      { slug: "gracia", name: "Gràcia", count: 1 },
    ])
  })
})
