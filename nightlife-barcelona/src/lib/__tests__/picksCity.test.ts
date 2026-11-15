import { beforeEach, describe, expect, it, vi } from "vitest"

// Una base de datos de mentira: el Top 3 de hoy, con un club de cada ciudad (select → lte → gte → order).
const table = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))
vi.mock("../supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ lte: () => ({ gte: () => ({ order: () => Promise.resolve({ data: table.rows, error: null }) }) }) }),
    }),
  },
}))

import { getActivePicks } from "../picks"

const club = (id: number, name: string, city: string | null, lat: number | null, lng: number | null, hidden = false) => ({
  id, name, slug: name.toLowerCase(), image: null, neighborhood: null, music: null, hidden, city, latitude: lat, longitude: lng,
})
const row = (rank: number, c: ReturnType<typeof club>, period = "night") => ({ rank, note: null, period, club: c })

describe("getActivePicks por ciudad", () => {
  beforeEach(() => {
    table.rows = [
      row(1, club(1, "Razzmatazz", "Barcelona", 41.397, 2.191)),
      row(2, club(2, "Apolo", null, null, null)),
      row(1, club(3, "Kapital", "Madrid", 40.411, -3.692)),
      row(2, club(4, "Joy", null, 40.42, -3.7)),
    ]
  })

  it("Barcelona (por defecto) no ve los recomendados de Madrid", async () => {
    const res = await getActivePicks()
    expect(res?.picks.map((p) => p.club.name)).toEqual(["Razzmatazz", "Apolo"])
  })
  it("Madrid ve solo los suyos, con su propio puesto 1 y 2", async () => {
    const res = await getActivePicks("madrid")
    expect(res?.picks.map((p) => [p.rank, p.club.name])).toEqual([[1, "Kapital"], [2, "Joy"]])
  })
  it("no se cuelan columnas internas en el club que llega a la portada", async () => {
    const res = await getActivePicks("madrid")
    expect(Object.keys(res!.picks[0].club).sort()).toEqual(["id", "image", "music", "name", "neighborhood", "slug"])
  })
  it("un recomendado con el club oculto no sale", async () => {
    table.rows = [row(1, club(3, "Kapital", "Madrid", 40.411, -3.692, true))]
    expect(await getActivePicks("madrid")).toBeNull()
  })
  it("sin recomendados de la ciudad no sale nada", async () => {
    table.rows = [row(1, club(1, "Razzmatazz", "Barcelona", 41.397, 2.191))]
    expect(await getActivePicks("madrid")).toBeNull()
  })
})
