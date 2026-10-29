import { describe, expect, it } from "vitest"
import { buildAreaFacts, entryPrices, firstSlot } from "../areaFacts"

describe("entryPrices", () => {
  it("lee rangos, precios sueltos y entrada gratis", () => {
    expect(entryPrices("€10–€15")).toEqual([10, 15])
    expect(entryPrices("10-15€")).toEqual([10, 15])
    expect(entryPrices("15€ con consumición")).toEqual([15])
    expect(entryPrices("Gratis")).toEqual([0])
  })
  it("ignora lo que no es una entrada", () => {
    expect(entryPrices("2 copas")).toEqual([])
    expect(entryPrices("Mesa 300€")).toEqual([])
    expect(entryPrices(null)).toEqual([])
  })
})

describe("firstSlot", () => {
  it("coge la primera franja del horario", () => {
    expect(firstSlot("23:55-06:00")).toEqual({ open: "23:55", close: "06:00" })
    expect(firstSlot("J-S 00:00-06:00 | D 19:00-01:00")).toEqual({ open: "00:00", close: "06:00" })
    expect(firstSlot("cerrado")).toBeNull()
  })
})

describe("buildAreaFacts", () => {
  // Ecoparc (L10): 41.3301838, 2.1370899
  const at = { latitude: 41.3302, longitude: 2.1371 }
  const clubs = [
    { id: 1, name: "A", slug: "a", price: "€10–€15", hours: "23:55-06:00", music: "Techno, House", google_rating: 4.6, ...at },
    { id: 2, name: "B", slug: "b", price: "Gratis", hours: "23:55-06:00", music: "Techno", google_rating: 4.2, ...at },
    { id: 3, name: "C", slug: "c", price: "20€", hours: "22:00-02:00", music: "Reggaeton", google_rating: 3.9, ...at },
    { id: 4, name: "D", slug: "d", price: null, hours: null, music: "Reggaeton, Latina", rating: 4.4, ...at },
  ]

  it("resume entrada, horario, estilos, metro, Nitbus y mejor valorados", () => {
    const f = buildAreaFacts(clubs, [{ lat: 41.3302, lon: 2.1371, codes: ["N7", "N9"] }])
    expect(f.total).toBe(4)
    expect(f.price).toEqual({ min: 0, max: 20 })
    expect(f.hours).toEqual({ open: "23:55", close: "06:00" })
    expect(f.late).toEqual({ n: 2, of: 3 }) // A y B pasan de las 02:30; C cierra a las 02:00
    expect(f.styles).toEqual(["electronica", "reggaeton"]) // techno va dentro de «electrónica»
    expect(f.metro).toEqual(["Ecoparc"])
    expect(f.nitbus).toEqual(["N7", "N9"])
    expect(f.top.map((c) => c.name)).toEqual(["A", "D", "B"])
  })

  it("no inventa datos con pocos locales", () => {
    const f = buildAreaFacts([clubs[0], clubs[1]])
    expect(f.price).toBeNull()
    expect(f.hours).toBeNull()
    expect(f.late).toBeNull()
    expect(f.nitbus).toEqual([])
  })
})
