import { describe, it, expect, vi } from "vitest"

// Un supabase de mentira: events (select → eq → order) y clubs (select → order → range, de 1000 en 1000).
const CLUBS = [
  { name: "Sala Apolo", city: "Barcelona", latitude: 41.374, longitude: 2.169 },
  { name: "Joy Eslava", city: "Madrid", latitude: 40.417, longitude: -3.707 },
  { name: "Moonlight", city: "Madrid", latitude: null, longitude: null },
  { name: "Moonlight", city: "Barcelona", latitude: 41.39, longitude: 2.16 }, // mismo nombre en las dos ciudades
]
const EVENTS = [
  { id: 1, title: "Concierto en el Apolo", club_name: "Sala Apolo", latitude: null, longitude: null },
  { id: 2, title: "Fiesta en Joy", club_name: "Joy Eslava", latitude: null, longitude: null },
  { id: 3, title: "Festival Madrid", club_name: null, latitude: 40.42, longitude: -3.70 },
  { id: 4, title: "Festival BCN", club_name: null, latitude: 41.38, longitude: 2.17 },
  { id: 5, title: "Sin nada de nada", club_name: null, latitude: null, longitude: null },
  { id: 6, title: "Noche en Moonlight (ambiguo)", club_name: "Moonlight", latitude: null, longitude: null },
]
let eventsHidden: boolean | undefined
vi.mock("../supabase", () => ({
  supabase: {
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: (_col: string, value: boolean) => {
          eventsHidden = value
          return builder
        },
        order: () => builder,
        range: (from: number, to: number) => Promise.resolve({ data: CLUBS.slice(from, to + 1), error: null }),
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: table === "events" ? EVENTS : [], error: null }).then(ok),
      }
      return builder
    },
  },
}))

import { eventsForCity, fetchCityEvents } from "../cityEvents"

describe("eventsForCity", () => {
  it("separa los eventos por sus coordenadas o por el local donde son", () => {
    const ids = (city: "barcelona" | "madrid") => eventsForCity(EVENTS, CLUBS, city).map((e) => e.id)
    expect(ids("madrid")).toEqual([2, 3])
    // Lo que no encaja en nada (y el local que está en las dos ciudades, sin coordenadas) es de Barcelona, como en toda la web.
    expect(ids("barcelona")).toEqual([1, 4, 5, 6])
  })
  it("cada evento está en una sola ciudad", () => {
    const b = eventsForCity(EVENTS, CLUBS, "barcelona").length
    const m = eventsForCity(EVENTS, CLUBS, "madrid").length
    expect(b + m).toBe(EVENTS.length)
  })
})

describe("fetchCityEvents", () => {
  it("pide los publicados y devuelve solo los de la ciudad", async () => {
    const madrid = await fetchCityEvents("madrid")
    expect(madrid.map((e) => e.id)).toEqual([2, 3])
    expect(eventsHidden).toBe(false)
    const bcn = await fetchCityEvents("barcelona")
    expect(bcn.map((e) => e.id)).toEqual([1, 4, 5, 6])
  })
})
