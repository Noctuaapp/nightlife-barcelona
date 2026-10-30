import { describe, expect, it } from "vitest"
import { unitFor, weightedOrder } from "../rotation"

const clubs = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, q: i < 8 ? 7 : i < 20 ? 4 : 1.5 }))
const opts = (seed: number) => ({ seed, id: (c: { id: number }) => c.id, weight: (c: { q: number }) => Math.max(1, c.q) ** 1.5 })

describe("rotación de la portada", () => {
  it("el número de un local depende solo de la semilla y su id", () => {
    expect(unitFor(123, 7)).toBe(unitFor(123, 7))
    expect(unitFor(123, 7)).not.toBe(unitFor(124, 7))
    for (let i = 0; i < 200; i++) {
      const u = unitFor(i + 1, i)
      expect(u).toBeGreaterThan(0)
      expect(u).toBeLessThan(1)
    }
  })

  it("sin semilla no mezcla y no toca la lista original", () => {
    const input = [...clubs]
    expect(weightedOrder(input, opts(0))).toEqual(clubs)
    expect(input).toEqual(clubs)
  })

  it("misma semilla, mismo orden; otra semilla, otro orden", () => {
    const a = weightedOrder(clubs, opts(11)).map((c) => c.id)
    expect(weightedOrder(clubs, opts(11)).map((c) => c.id)).toEqual(a)
    expect(weightedOrder(clubs, opts(12)).map((c) => c.id)).not.toEqual(a)
  })

  it("quitar un local no reordena a los demás", () => {
    const full = weightedOrder(clubs, opts(5)).map((c) => c.id)
    const without = weightedOrder(clubs.filter((c) => c.id !== 3), opts(5)).map((c) => c.id)
    expect(without).toEqual(full.filter((id) => id !== 3))
  })

  it("las 10 primeras posiciones cambian de visita a visita y no son siempre las mismas 24", () => {
    const seen = new Set<number>()
    for (let seed = 1; seed <= 60; seed++) weightedOrder(clubs, opts(seed)).slice(0, 10).forEach((c) => seen.add(c.id))
    expect(seen.size).toBeGreaterThan(24)
  })

  it("los mejor puntuados salen delante con más frecuencia", () => {
    let top = 0
    let low = 0
    for (let seed = 1; seed <= 200; seed++) {
      for (const c of weightedOrder(clubs, opts(seed)).slice(0, 10)) {
        if (c.q === 7) top++
        else if (c.q === 1.5) low++
      }
    }
    // 8 locales top y 20 flojos: por local, los top aparecen bastante más que los flojos
    expect(top / 8).toBeGreaterThan((low / 20) * 3)
  })
})
