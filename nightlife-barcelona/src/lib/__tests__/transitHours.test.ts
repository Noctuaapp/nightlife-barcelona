import { describe, it, expect, afterEach, vi } from "vitest"
import { getMetroTonight } from "../transitHours"

afterEach(() => vi.useRealTimers())
const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe("getMetroTonight", () => {
  it("martes normal: cierra a medianoche", () => {
    at("2026-10-13T20:00:00Z") // martes 22:00
    expect(getMetroTonight()).toMatchObject({ state: "open", closes: "00:00" })
  })
  it("viernes: hasta las 02:00", () => {
    at("2026-10-16T20:00:00Z") // viernes 22:00
    expect(getMetroTonight().closes).toBe("02:00")
  })
  it("sábado: toda la noche", () => {
    at("2026-10-17T20:00:00Z")
    expect(getMetroTonight().closes).toBe("all-night")
  })
  it("víspera de festivo (11 de octubre de 2026, domingo, víspera del 12): hasta las 02:00", () => {
    at("2026-10-11T20:00:00Z")
    expect(getMetroTonight().closes).toBe("02:00")
  })
  it("lunes a las 03:00 (tras un domingo normal): cerrado", () => {
    at("2026-10-19T01:00:00Z")
    expect(getMetroTonight().state).toBe("closed")
  })
  it("Nochevieja: toda la noche", () => {
    at("2026-12-31T21:00:00Z")
    expect(getMetroTonight().closes).toBe("all-night")
  })
})
