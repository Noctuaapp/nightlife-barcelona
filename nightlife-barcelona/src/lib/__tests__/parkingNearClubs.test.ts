import { describe, it, expect } from "vitest"
import { clubsNear, clubsNearCount, NEAR_CLUB_METERS } from "../parkingNearClubs"

// Punto de referencia en el Poblenou; 0,001° de latitud ≈ 111 m.
const P = { lat: 41.4, lon: 2.2 }
const club = (id: number, name: string, dLat: number, dLon = 0) => ({ id, name, slug: name.toLowerCase(), latitude: P.lat + dLat, longitude: P.lon + dLon })

describe("clubsNear", () => {
  it("devuelve los clubs a distancia de paseo, del más cercano al más lejano, con los minutos a pie", () => {
    const clubs = [club(1, "Lejos", 0.02), club(2, "Cerca", 0.002), club(3, "Medio", 0.006)] // ≈ 2,2 km, 220 m, 670 m
    const r = clubsNear(P.lat, P.lon, clubs)
    expect(r.map((c) => c.name)).toEqual(["Cerca", "Medio"])
    expect(r[0].minutes).toBe(3) // ~222 m / 80 m por minuto
    expect(r[1].meters).toBeGreaterThan(r[0].meters)
    expect(r.every((c) => c.meters <= NEAR_CLUB_METERS)).toBe(true)
  })

  it("enseña como mucho tres", () => {
    const clubs = [1, 2, 3, 4, 5].map((i) => club(i, `C${i}`, 0.001 * i))
    expect(clubsNear(P.lat, P.lon, clubs).map((c) => c.name)).toEqual(["C1", "C2", "C3"])
    expect(clubsNearCount(P.lat, P.lon, clubs)).toBe(5)
  })

  it("acepta coordenadas como texto (como llegan de la base de datos)", () => {
    const r = clubsNear("41.4", "2.2", [{ id: 1, name: "A", latitude: "41.401", longitude: "2.2" }])
    expect(r).toHaveLength(1)
    expect(r[0].slug).toBeNull()
  })

  it("ignora clubs sin coordenadas y parkings sin coordenadas", () => {
    expect(clubsNear(P.lat, P.lon, [{ id: 1, name: "Sin coords", latitude: null, longitude: null }])).toEqual([])
    expect(clubsNear(null, null, [club(1, "A", 0.001)])).toEqual([])
    expect(clubsNear(P.lat, P.lon, [{ id: 1, name: "Vacío", latitude: "", longitude: "" }])).toEqual([])
  })

  it("si no hay ningún club cerca, lista vacía", () => {
    expect(clubsNear(P.lat, P.lon, [club(1, "Lejos", 0.05)])).toEqual([])
  })
})
