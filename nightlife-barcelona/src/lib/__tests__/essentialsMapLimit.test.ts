import { describe, it, expect } from "vitest"
import { limitEssentialsForMap, PER_CATEGORY, CATEGORY_CAP } from "../essentialsMapLimit"

const centre = { lat: 41.3851, lng: 2.1734 }
const mk = (category: string, n: number, step = 0.001) =>
  Array.from({ length: n }, (_, k) => ({ category, name: `${category}-${k}`, latitude: 41.3851 + k * step, longitude: 2.1734 }))

describe("limitEssentialsForMap", () => {
  it("sin categoría: como mucho PER_CATEGORY de cada una, no todo", () => {
    const items = [...mk("Nitbus", 2000), ...mk("Bicing", 540), ...mk("Pharmacy", 2)]
    const out = limitEssentialsForMap(items, { category: "", center: centre })
    expect(out.filter((x) => x.category === "Nitbus")).toHaveLength(PER_CATEGORY)
    expect(out.filter((x) => x.category === "Bicing")).toHaveLength(PER_CATEGORY)
    expect(out.filter((x) => x.category === "Pharmacy")).toHaveLength(2)
    expect(out.length).toBeLessThan(15)
  })

  it("sin categoría: se quedan los más cercanos al centro de cada categoría", () => {
    const items = mk("Food", 10, 0.01)
    const out = limitEssentialsForMap(items.slice().reverse(), { category: "", center: centre })
    expect(out.map((x) => x.name)).toEqual(["Food-0", "Food-1", "Food-2", "Food-3"])
  })

  it("con categoría: solo esa, entera hasta el tope y los más cercanos primero", () => {
    const items = [...mk("Nitbus", 2000), ...mk("Bicing", 50)]
    const out = limitEssentialsForMap(items, { category: "Nitbus", center: centre })
    expect(out).toHaveLength(CATEGORY_CAP)
    expect(out.every((x) => x.category === "Nitbus")).toBe(true)
    expect(out[0].name).toBe("Nitbus-0")
    expect(limitEssentialsForMap(items, { category: "Bicing", center: centre })).toHaveLength(50)
  })

  it("ignora los que no tienen coordenadas", () => {
    const items = [{ category: "ATM", latitude: null, longitude: null }, ...mk("ATM", 1)]
    expect(limitEssentialsForMap(items, { category: "", center: centre })).toHaveLength(1)
  })
})
