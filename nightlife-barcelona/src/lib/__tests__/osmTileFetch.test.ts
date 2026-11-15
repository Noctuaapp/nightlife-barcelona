import { describe, it, expect } from "vitest"
import { fetchTileElements } from "../osmTileFetch"
import { tilesOf, TILE_AREAS } from "../osmTiles"

const blocksFor = (scope: string) => [`nwr${scope}["amenity"="pharmacy"];`]
const scopeOf = (q: string) => q.match(/nwr(\([^)]*\))/)![1]

describe("fetchTileElements", () => {
  it("junta los elementos de todas las cuadrículas y quita los repetidos entre ellas", async () => {
    const tiles = tilesOf(TILE_AREAS.madrid1)
    expect(tiles).toHaveLength(8)
    const calls: string[] = []
    const r = await fetchTileElements({
      tiles,
      blocksFor,
      errors: [],
      query: async (q) => {
        calls.push(scopeOf(q))
        // El nodo 1 sale en todas (cae en el borde de varias cuadrículas); cada una trae además uno propio.
        return [{ type: "node", id: 1 }, { type: "node", id: 100 + calls.length }]
      },
    })
    expect(r.failed).toBe(0)
    expect(r.ok).toBe(8)
    expect(r.elements.filter((e) => e.id === 1)).toHaveLength(1)
    expect(r.elements).toHaveLength(9)
    expect(new Set(calls).size).toBe(8)
  })

  it("la consulta lleva el bloque de cada cuadrícula y pide el centro de las áreas", async () => {
    const queries: string[] = []
    await fetchTileElements({ tiles: ["(40.1,-3.8,40.2,-3.7)"], blocksFor, errors: [], query: async (q) => { queries.push(q); return [] } })
    expect(queries[0]).toContain(`nwr(40.1,-3.8,40.2,-3.7)["amenity"="pharmacy"];`)
    expect(queries[0]).toContain("out center tags;")
    expect(queries[0]).toContain("[out:json]")
  })

  it("reintenta en la pasada siguiente lo que falla y lo cuenta como hecho si luego responde", async () => {
    const tiles = ["(1,1,2,2)", "(3,3,4,4)"]
    const seen = new Map<string, number>()
    const r = await fetchTileElements({
      tiles,
      blocksFor,
      errors: [],
      query: async (q) => {
        const s = scopeOf(q)
        seen.set(s, (seen.get(s) || 0) + 1)
        if (s === "(1,1,2,2)" && seen.get(s)! < 2) return null
        return [{ type: "node", id: s === "(1,1,2,2)" ? 10 : 20 }]
      },
    })
    expect(r).toMatchObject({ ok: 2, failed: 0 })
    expect(seen.get("(1,1,2,2)")).toBe(2)
    expect(seen.get("(3,3,4,4)")).toBe(1)
    expect(r.elements.map((e) => e.id).sort()).toEqual([10, 20])
  })

  it("las que no responden nunca cuentan como fallidas, y las demás siguen", async () => {
    const r = await fetchTileElements({
      tiles: ["(1,1,2,2)", "(3,3,4,4)"],
      blocksFor,
      errors: [],
      query: async (q) => (scopeOf(q) === "(1,1,2,2)" ? null : [{ type: "way", id: 5 }]),
    })
    expect(r).toMatchObject({ ok: 1, failed: 1 })
    expect(r.elements).toHaveLength(1)
  })

  it("si se acaba el tiempo deja el resto como fallido sin pedirlo", async () => {
    let clock = 0
    let calls = 0
    const tiles = Array.from({ length: 12 }, (_, i) => `(${i},${i},${i + 1},${i + 1})`)
    const r = await fetchTileElements({
      tiles,
      blocksFor,
      errors: [],
      budgetMs: 52000,
      now: () => clock,
      query: async () => {
        calls++
        clock += 6000 // cada consulta suma 6 s: una tanda de 4 consume 24 s
        return [{ type: "node", id: calls }]
      },
    })
    // Tanda 1 a t=0 (acaba en 24 s) y tanda 2 a t=24 s (acaba en 48 s). La tercera ya no cabe: a los 48 s quedan menos de 9 s de margen sobre los 52 s.
    expect(r.ok).toBe(8)
    expect(r.failed).toBe(4)
  })

  it("con todas las respuestas vacías no falla: devuelve cero elementos", async () => {
    const r = await fetchTileElements({ tiles: ["(1,1,2,2)"], blocksFor, errors: [], query: async () => [] })
    expect(r).toEqual({ elements: [], ok: 1, failed: 0 })
  })
})
