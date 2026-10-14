import { describe, it, expect, afterEach, vi } from "vitest"
import { getOpenStatus } from "../openStatus"

afterEach(() => vi.useRealTimers())

describe("getOpenStatus", () => {
  it("24 horas", () => {
    expect(getOpenStatus("Open 24 hours").state).toBe("open")
  })
  it("cierra pronto en la madrugada", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-17T00:15:00Z")) // sábado 02:15 Madrid
    const st = getOpenStatus("Monday to Sunday 9:00 AM – 3:00 AM")
    expect(st.state).toBe("open")
    expect(st.soon).toBe(true)
    expect(st.label).toBe("Cierra pronto · 03:00")
  })
  it("traduce si se pasa t()", () => {
    const t = (k: string) => (k === "openStatus.h24" ? "Open 24 h" : k)
    expect(getOpenStatus("Open 24 hours", t).label).toBe("Open 24 h")
  })
  it("sin datos: unknown", () => {
    expect(getOpenStatus(null).state).toBe("unknown")
  })
})
