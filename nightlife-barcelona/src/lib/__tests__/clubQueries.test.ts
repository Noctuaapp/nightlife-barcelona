import { beforeEach, describe, expect, it, vi } from "vitest"

// Una base de datos de mentira: siempre devuelve estos locales, sin importar la consulta.
const rows = vi.hoisted(() => [
  { id: 1, name: "Razzmatazz", city: "Barcelona", latitude: 41.397, longitude: 2.191, hidden: false },
  { id: 2, name: "Apolo", city: null, latitude: null, longitude: null, hidden: false },
  { id: 3, name: "Kapital", city: "Madrid", latitude: 40.411, longitude: -3.692, hidden: false },
  { id: 4, name: "Sin ciudad en Madrid", city: null, latitude: 40.42, longitude: -3.7, hidden: false },
  { id: 5, name: "Atzavara", city: "Sant Boi de Llobregat", latitude: 41.34, longitude: 2.04, hidden: false },
])
// La base devuelve de 1.000 en 1.000, como Supabase (select → eq → order → range).
const table = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))
vi.mock("../supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => ({ range: (from: number, to: number) => Promise.resolve({ data: table.rows.slice(from, to + 1), error: null }) }) }),
      }),
    }),
  },
}))

import { CITIES } from "../cities"
import { clubsOfCity, fetchVisibleClubs, type DbRow } from "../clubQueries"

const names = (list: DbRow[]) => list.map((c) => String(c.name))

describe("clubsOfCity", () => {
  it("Barcelona es todo lo que no es Madrid (con su área metropolitana y los locales sin ciudad)", () => {
    expect(names(clubsOfCity(rows, "barcelona"))).toEqual(["Razzmatazz", "Apolo", "Atzavara"])
  })
  it("Madrid, por el texto de la ciudad o por las coordenadas", () => {
    expect(names(clubsOfCity(rows, "madrid"))).toEqual(["Kapital", "Sin ciudad en Madrid"])
  })
  it("«all» no filtra", () => {
    expect(clubsOfCity(rows, "all")).toHaveLength(5)
  })
})

describe("fetchVisibleClubs", () => {
  beforeEach(() => {
    CITIES.madrid.prelaunch = true
    table.rows = rows
  })

  it("por defecto es Barcelona: los locales de Madrid publicados no se cuelan en sus páginas", async () => {
    expect(names(await fetchVisibleClubs("id, name, city, latitude, longitude"))).toEqual(["Razzmatazz", "Apolo", "Atzavara"])
  })

  it("con Madrid en prelaunch, Madrid devuelve vacío aunque haya locales publicados", async () => {
    expect(await fetchVisibleClubs("id, name, city, latitude, longitude", "madrid")).toEqual([])
  })

  it("con Madrid abierta, Madrid devuelve sus locales y Barcelona sigue sin ellos", async () => {
    CITIES.madrid.prelaunch = false
    try {
      expect(names(await fetchVisibleClubs("id, name, city, latitude, longitude", "madrid"))).toEqual(["Kapital", "Sin ciudad en Madrid"])
      expect(names(await fetchVisibleClubs("id, name, city, latitude, longitude"))).toEqual(["Razzmatazz", "Apolo", "Atzavara"])
    } finally {
      CITIES.madrid.prelaunch = true
    }
  })

  it("«all» devuelve todos (lo usa el sitemap)", async () => {
    expect(await fetchVisibleClubs("id, name", "all")).toHaveLength(5)
  })
})

describe("fetchVisibleClubs · más de 1.000 locales", () => {
  it("pide página a página y no se queda en los primeros 1.000", async () => {
    table.rows = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, name: `Club ${i + 1}`, city: i % 2 === 0 ? "Barcelona" : "Madrid", latitude: null, longitude: null }))
    expect(await fetchVisibleClubs("id, name, city", "all")).toHaveLength(2500)
    expect(await fetchVisibleClubs("id, name, city")).toHaveLength(1250)
  })
})
