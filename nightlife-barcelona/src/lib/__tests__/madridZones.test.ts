import { describe, it, expect } from "vitest"
import { MADRID_ZONES, MADRID_ZONE_NAMES, madridZoneOf, madridNeighborhoodFor } from "../madridZones"
import { MADRID_METRO_STATIONS } from "../madridMetro"
import { zoneOf, zonesPresent, ZONES } from "../zones"
import { ZONE_PAGES, areaHref } from "../zonePages"

describe("madridZones: definición", () => {
  it("hay 12 zonas con nombre único y todas las anclas son estaciones reales", () => {
    expect(MADRID_ZONES).toHaveLength(12)
    expect(new Set(MADRID_ZONE_NAMES).size).toBe(12)
    for (const z of MADRID_ZONES) {
      expect(z.anchors.length).toBeGreaterThan(0)
      expect(z.radiusM).toBeGreaterThanOrEqual(300)
      expect(z.radiusM).toBeLessThanOrEqual(700)
      for (const a of z.anchors) expect(MADRID_METRO_STATIONS.some((s) => s.name === a)).toBe(true)
    }
  })

  it("cada ancla pertenece a una sola zona", () => {
    const seen = new Map<string, string>()
    for (const z of MADRID_ZONES) {
      for (const a of z.anchors) {
        expect(seen.has(a)).toBe(false)
        seen.set(a, z.name)
      }
    }
  })

  it("la propia estación de cada ancla cae en su zona", () => {
    for (const z of MADRID_ZONES) {
      for (const a of z.anchors) {
        const st = MADRID_METRO_STATIONS.find((s) => s.name === a)!
        expect(madridZoneOf(st.lat, st.lon)).toBe(z.name)
      }
    }
  })
})

describe("madridZoneOf", () => {
  it("reconoce puntos conocidos de cada zona", () => {
    expect(madridZoneOf(40.4258, -3.7043)).toBe("Malasaña") // Plaza del Dos de Mayo
    expect(madridZoneOf(40.4226, -3.6975)).toBe("Chueca") // Plaza de Chueca
    expect(madridZoneOf(40.4201, -3.7057)).toBe("Gran Vía") // Callao
    expect(madridZoneOf(40.4169, -3.7035)).toBe("Sol") // Puerta del Sol
    expect(madridZoneOf(40.418, -3.7109)).toBe("Ópera") // Teatro Real
    expect(madridZoneOf(40.412, -3.7085)).toBe("La Latina") // Cava Baja
    expect(madridZoneOf(40.4085, -3.7009)).toBe("Lavapiés") // Plaza de Lavapiés
    expect(madridZoneOf(40.4125, -3.6994)).toBe("Huertas") // Antón Martín
    expect(madridZoneOf(40.4282, -3.6958)).toBe("Alonso Martínez")
    expect(madridZoneOf(40.4254, -3.6866)).toBe("Salamanca") // calle Serrano
    expect(madridZoneOf(40.4338, -3.7035)).toBe("Chamberí") // Plaza de Olavide
    expect(madridZoneOf(40.431, -3.715)).toBe("Argüelles") // calle Princesa
  })

  it("devuelve null fuera de las 12 zonas", () => {
    expect(madridZoneOf(40.4073, -3.6925)).toBeNull() // Atocha
    expect(madridZoneOf(40.453, -3.688)).toBeNull() // Bernabéu
    expect(madridZoneOf(41.3874, 2.1686)).toBeNull() // Barcelona
  })

  it("acepta números en texto y rechaza valores vacíos o no numéricos", () => {
    expect(madridZoneOf("40.4169", "-3.7035")).toBe("Sol")
    expect(madridZoneOf(null, -3.7)).toBeNull()
    expect(madridZoneOf(40.4, undefined)).toBeNull()
    expect(madridZoneOf("", "")).toBeNull()
    expect(madridZoneOf(Number.NaN, -3.7)).toBeNull()
    expect(madridZoneOf("abc", "def")).toBeNull()
  })

  it("si dos zonas se solapan gana la que tiene el punto más dentro", () => {
    // Un punto sobre Tribunal está a 0 m de su ancla: Malasaña, no las vecinas.
    const tribunal = MADRID_METRO_STATIONS.find((s) => s.name === "Tribunal")!
    expect(madridZoneOf(tribunal.lat, tribunal.lon)).toBe("Malasaña")
    const chueca = MADRID_METRO_STATIONS.find((s) => s.name === "Chueca")!
    expect(madridZoneOf(chueca.lat, chueca.lon)).toBe("Chueca")
  })
})

describe("madridNeighborhoodFor", () => {
  it("la zona popular manda sobre el barrio de OpenStreetMap", () => {
    expect(madridNeighborhoodFor(40.4258, -3.7043, "Universidad")).toBe("Malasaña")
  })
  it("fuera de las zonas conserva el barrio que ya traía", () => {
    expect(madridNeighborhoodFor(40.4073, -3.6925, "Atocha")).toBe("Atocha")
    expect(madridNeighborhoodFor(40.4073, -3.6925, "  Atocha  ")).toBe("Atocha")
  })
  it("sin zona ni barrio devuelve Madrid", () => {
    expect(madridNeighborhoodFor(40.4073, -3.6925)).toBe("Madrid")
    expect(madridNeighborhoodFor(40.4073, -3.6925, "")).toBe("Madrid")
    expect(madridNeighborhoodFor(40.4073, -3.6925, "   ")).toBe("Madrid")
    expect(madridNeighborhoodFor(null, null, null)).toBe("Madrid")
  })
})

describe("zoneOf con Madrid", () => {
  it("un local de Madrid ya no cae en Barcelona", () => {
    expect(zoneOf({ city: "Madrid" })).toBe("Madrid")
    expect(zoneOf({ city: "Madrid", neighborhood: "Malasaña" })).toBe("Madrid")
    expect(zoneOf({ neighborhood: "Madrid" })).toBe("Madrid")
    expect(zoneOf({ latitude: 40.4169, longitude: -3.7035 })).toBe("Madrid")
    expect(zoneOf({ latitude: "40.4169", longitude: "-3.7035" })).toBe("Madrid")
  })

  it("por dirección: código postal de Madrid capital o «Madrid» al final", () => {
    expect(zoneOf({ address: "Calle de Fuencarral, 10, 28004 Madrid" })).toBe("Madrid")
    expect(zoneOf({ address: "Calle Mayor, 1, Madrid" })).toBe("Madrid")
    expect(zoneOf({ address: "Calle Mayor, 1, 28013" })).toBe("Madrid")
  })

  it("«Madrid» en el nombre de una calle de Barcelona no cuenta", () => {
    expect(zoneOf({ address: "Carrer de Madrid, 5, Barcelona" })).toBe("Barcelona")
    expect(zoneOf({ address: "Carrer de Madrid, 5, 08028 Barcelona" })).toBe("Barcelona")
    expect(zoneOf({ neighborhood: "Madrid Park" })).toBe("Barcelona")
  })

  it("no cambia nada del área de Barcelona", () => {
    expect(zoneOf({ city: "Barcelona" })).toBe("Barcelona")
    expect(zoneOf({ city: "Badalona" })).toBe("Badalona")
    expect(zoneOf({ neighborhood: "Raval", latitude: 41.38, longitude: 2.17 })).toBe("Barcelona")
    expect(zoneOf({ address: "Carrer Major 1, 08830 Sant Boi de Llobregat" })).toBe("Sant Boi de Llobregat")
    expect(zoneOf({})).toBe("Barcelona")
  })

  it("zonesPresent incluye Madrid solo si hay locales de Madrid, y en el orden de ZONES", () => {
    expect(zonesPresent([{ city: "Barcelona" }])).toEqual(["Barcelona"])
    expect(zonesPresent([{ city: "Madrid" }, { city: "Badalona" }, { city: "Barcelona" }])).toEqual(["Barcelona", "Badalona", "Madrid"])
    expect(ZONES[ZONES.length - 1]).toBe("Madrid")
  })

  it("Madrid no tiene página de zona todavía y sus barrios enlazan a /barrio", () => {
    expect(ZONE_PAGES).not.toContain("Madrid")
    expect(areaHref("Malasaña")).toBe("/barrio/malasana")
    expect(areaHref("Gran Vía")).toBe("/barrio/gran-via")
  })
})
