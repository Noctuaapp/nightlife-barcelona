import { describe, it, expect } from "vitest"
import { TAXI_APPS, TAXI_PHONES, UBER_PICKUP_LINK, formatPhoneEs, telHref } from "../taxiOptions"

describe("taxiOptions", () => {
  it("formatea los teléfonos de nueve cifras de tres en tres", () => {
    expect(formatPhoneEs("933033033")).toBe("933 033 033")
    expect(formatPhoneEs("933001100")).toBe("933 001 100")
    expect(formatPhoneEs("933 033 033")).toBe("933 033 033")
  })

  it("deja como está lo que no tiene nueve cifras", () => {
    expect(formatPhoneEs("033")).toBe("033")
    expect(formatPhoneEs("+34 933 033 033")).toBe("+34 933 033 033")
  })

  it("el enlace de llamada solo lleva cifras y el + inicial", () => {
    expect(telHref("933 033 033")).toBe("tel:933033033")
    expect(telHref("+34 933-033-033")).toBe("tel:+34933033033")
  })

  it("todas las apps tienen logo propio en public/brands y nombre único", () => {
    expect(TAXI_APPS.map((a) => a.id)).toEqual(["freenow", "cabify", "uber"])
    for (const a of TAXI_APPS) expect(a.logo).toBe(`/brands/${a.id}.png`)
    expect(new Set(TAXI_APPS.map((a) => a.name)).size).toBe(TAXI_APPS.length)
  })

  it("los teléfonos son números españoles de nueve cifras y no se repiten", () => {
    for (const p of TAXI_PHONES) expect(p.phone).toMatch(/^9\d{8}$/)
    expect(new Set(TAXI_PHONES.map((p) => p.phone)).size).toBe(TAXI_PHONES.length)
  })

  it("el enlace de Uber pide la recogida en tu ubicación", () => {
    expect(UBER_PICKUP_LINK).toContain("pickup=my_location")
    expect(UBER_PICKUP_LINK.startsWith("https://")).toBe(true)
  })
})
