import { describe, it, expect } from "vitest"
import { essentialsOfCity, scopeToCity, outsideOtherCities } from "../cityEssentials"
import { CITIES } from "../cities"

// Un «constructor de consultas» falso que apunta cada filtro que recibe.
function fakeQuery() {
  const calls: [string, ...unknown[]][] = []
  const q: any = new Proxy({}, {
    get: (_t, name: string) => (...args: unknown[]) => {
      calls.push([name, ...args])
      return q
    },
  })
  return { q, calls }
}

describe("essentialsOfCity", () => {
  const rows = [
    { id: 1, latitude: 41.3874, longitude: 2.1686 }, // Barcelona
    { id: 2, latitude: "40.4169", longitude: "-3.7035" }, // Madrid (en texto)
    { id: 3, latitude: null, longitude: null }, // sin coordenadas: Barcelona
    { id: 4, latitude: 41.5, longitude: 2.0, city: "Badalona" },
    { id: 5, latitude: 40.43, longitude: -3.69, city: "Madrid" },
  ]
  it("separa por coordenadas y deja sin coordenadas en Barcelona", () => {
    expect(essentialsOfCity(rows, "barcelona").map((r) => r.id)).toEqual([1, 3, 4])
    expect(essentialsOfCity(rows, "madrid").map((r) => r.id)).toEqual([2, 5])
  })
  it("no pierde ni repite ninguna fila", () => {
    const total = essentialsOfCity(rows, "barcelona").length + essentialsOfCity(rows, "madrid").length
    expect(total).toBe(rows.length)
  })
})

describe("scopeToCity", () => {
  it("Barcelona: solo los publicados, sin tocar coordenadas", () => {
    const { q, calls } = fakeQuery()
    scopeToCity(q, "barcelona")
    expect(calls).toEqual([["eq", "hidden", false]])
  })

  it("Madrid en prelaunch: dentro de su rectángulo y con los ocultos", () => {
    expect(CITIES.madrid.prelaunch).toBe(true)
    const { q, calls } = fakeQuery()
    scopeToCity(q, "madrid")
    const b = CITIES.madrid.box
    expect(calls).toContainEqual(["gte", "latitude", b.south])
    expect(calls).toContainEqual(["lte", "latitude", b.north])
    expect(calls).toContainEqual(["gte", "longitude", b.west])
    expect(calls).toContainEqual(["lte", "longitude", b.east])
    expect(calls.some((c) => c[0] === "eq" && c[1] === "hidden")).toBe(false)
  })
})

describe("outsideOtherCities", () => {
  it("excluye el rectángulo de Madrid pero deja pasar lo que no tiene coordenadas", () => {
    const { q, calls } = fakeQuery()
    outsideOtherCities(q)
    expect(calls).toHaveLength(1)
    const [name, filter] = calls[0] as [string, string]
    const b = CITIES.madrid.box
    expect(name).toBe("or")
    expect(filter).toContain("latitude.is.null")
    expect(filter).toContain("longitude.is.null")
    expect(filter).toContain(`latitude.lt.${b.south}`)
    expect(filter).toContain(`latitude.gt.${b.north}`)
    expect(filter).toContain(`longitude.lt.${b.west}`)
    expect(filter).toContain(`longitude.gt.${b.east}`)
  })
})
