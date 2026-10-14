import { describe, expect, it } from "vitest"
import { isInServiceArea, parseCoordNumber, parseCoords } from "../coords"

describe("parseCoords", () => {
  it("lee los números que copia Google Maps", () => {
    expect(parseCoords("41.3851, 2.1734")).toEqual({ lat: 41.3851, lng: 2.1734 })
    expect(parseCoords("41.38510123456,2.17340987654")).toEqual({ lat: 41.385101, lng: 2.17341 })
    expect(parseCoords("(41.3851 2.1734)")).toEqual({ lat: 41.3851, lng: 2.1734 })
  })

  it("lee grados, minutos y segundos", () => {
    const p = parseCoords(`41°23'06.4"N 2°10'24.2"E`)!
    expect(p.lat).toBeCloseTo(41.385111, 5)
    expect(p.lng).toBeCloseTo(2.173389, 5)
  })

  it("prefiere el pin exacto (!3d!4d) al centro de la vista (@)", () => {
    const url = "https://www.google.com/maps/place/Razzmatazz/@41.3975,2.1890,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.3977!4d2.1912"
    expect(parseCoords(url)).toEqual({ lat: 41.3977, lng: 2.1912 })
    expect(parseCoords("https://www.google.com/maps/@41.39,2.17,15z")).toEqual({ lat: 41.39, lng: 2.17 })
    expect(parseCoords("https://maps.google.com/?q=41.3851,2.1734")).toEqual({ lat: 41.3851, lng: 2.1734 })
  })

  it("devuelve null con enlaces cortos o texto sin coordenadas", () => {
    expect(parseCoords("https://maps.app.goo.gl/AbCdEf123")).toBeNull()
    expect(parseCoords("Carrer dels Almogàvers, 122")).toBeNull()
    expect(parseCoords("")).toBeNull()
    expect(parseCoords("95.1, 2.1")).toBeNull()
  })
})

describe("parseCoordNumber", () => {
  it("acepta coma decimal", () => {
    expect(parseCoordNumber("41,3851")).toBe(41.3851)
    expect(parseCoordNumber("")).toBeNull()
    expect(parseCoordNumber("abc")).toBeNull()
  })
})

describe("isInServiceArea", () => {
  it("detecta latitud y longitud cambiadas de sitio", () => {
    expect(isInServiceArea({ lat: 41.3851, lng: 2.1734 })).toBe(true)
    expect(isInServiceArea({ lat: 2.1734, lng: 41.3851 })).toBe(false)
  })
})

describe("coordToInput", () => {
  it("quita el ruido de decimales", async () => {
    const { coordToInput } = await import("../coords")
    expect(coordToInput(41.382000000000005)).toBe("41.382")
    expect(coordToInput(null)).toBe("")
  })
})
