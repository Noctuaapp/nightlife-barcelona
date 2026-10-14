import { describe, expect, it } from "vitest"
import { androidIntent, detectPlatform, iosScheme, uberLink } from "../rideLinks"

describe("rideLinks", () => {
  it("detecta la plataforma", () => {
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android")
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios")
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios")
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop")
  })

  it("arma el intent de Android con paquete y tienda de respaldo", () => {
    const url = androidIntent("cabify")
    expect(url.startsWith("intent://cabify#Intent;scheme=cabify;package=com.cabify.rider;")).toBe(true)
    expect(url).toContain(encodeURIComponent("https://play.google.com/store/apps/details?id=com.cabify.rider"))
    expect(url.endsWith(";end")).toBe(true)
    expect(iosScheme("cabify")).toBe("cabify://cabify")
  })

  it("Uber lleva el destino", () => {
    expect(uberLink("KU", null, 41.38, 2.19)).toContain("dropoff[latitude]=41.38")
    expect(uberLink("KU", "Pg. Marítim 38", null, null)).toContain(encodeURIComponent("Pg. Marítim 38"))
  })
})
