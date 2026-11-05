import { describe, it, expect } from "vitest"
import { androidIntent, destinationPath, iosScheme } from "../rideLinks"

describe("rideLinks · destino", () => {
  const dest = { name: "Sala Apolo", lat: 41.374, lng: 2.1699 }
  it("Cabify lleva el destino con las coordenadas", () => {
    const path = decodeURIComponent(destinationPath("cabify", dest))
    expect(path.startsWith("/journey?json=")).toBe(true)
    const json = JSON.parse(path.replace("/journey?json=", ""))
    expect(json.stops[0].loc).toEqual({ latitude: "41.374", longitude: "2.1699" })
    expect(json.stops[0].name).toBe("Sala Apolo")
  })
  it("sin coordenadas o en FREE NOW no se manda destino", () => {
    expect(destinationPath("cabify", { name: "X" })).toBe("")
    expect(destinationPath("freenow", dest)).toBe("")
    expect(iosScheme("freenow", dest)).toBe("freenow://")
  })
  it("el enlace de iPhone y el de Android incluyen el destino de Cabify", () => {
    expect(iosScheme("cabify", dest)).toContain("cabify://cabify/journey?json=")
    expect(androidIntent("cabify", dest)).toContain("intent://cabify/journey?json=")
    expect(androidIntent("cabify", dest)).toContain("package=com.cabify.rider")
  })
})
