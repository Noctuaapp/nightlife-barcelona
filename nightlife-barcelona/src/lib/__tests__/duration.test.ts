import { describe, it, expect } from "vitest"
import { fmtDuration, measuredSeconds } from "../duration"

describe("fmtDuration", () => {
  it("escribe segundos, minutos y horas", () => {
    expect(fmtDuration(0)).toBe("0 s")
    expect(fmtDuration(45)).toBe("45 s")
    expect(fmtDuration(60)).toBe("1 min")
    expect(fmtDuration(200)).toBe("3 min 20 s")
    expect(fmtDuration(725)).toBe("12 min")
    expect(fmtDuration(3900)).toBe("1 h 05 min")
  })
  it("no inventa nada cuando no hay dato", () => {
    expect(fmtDuration(null)).toBe("—")
    expect(fmtDuration(undefined)).toBe("—")
    expect(fmtDuration(NaN)).toBe("—")
    expect(fmtDuration(-5)).toBe("—")
  })
})

describe("measuredSeconds", () => {
  it("suma los page_time de una visita y corta los tramos absurdos", () => {
    expect(measuredSeconds([{ type: "page_nav" }, { type: "page_time", meta: { seconds: 30 } }, { type: "page_time", meta: { seconds: 12 } }])).toBe(42)
    expect(measuredSeconds([{ type: "page_time", meta: { seconds: 999999 } }])).toBe(1800)
  })
  it("devuelve null si la visita no tiene medición", () => {
    expect(measuredSeconds([{ type: "page_nav" }])).toBeNull()
    expect(measuredSeconds(null)).toBeNull()
    expect(measuredSeconds([{ type: "page_time", meta: { seconds: "abc" } }])).toBeNull()
  })
})
