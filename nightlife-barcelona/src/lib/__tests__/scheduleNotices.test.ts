import { afterEach, describe, expect, it, vi } from "vitest"
import { activeNotices, addDays, effectiveOpenNow, isClosedTonight, nightDay, parseNotices, pruneNotices, upcomingNotices } from "../scheduleNotices"

// Sábado 8 de noviembre de 2025 (hora de Madrid = UTC+1 en noviembre).
const at = (isoLocal: string) => vi.setSystemTime(new Date(`${isoLocal}+01:00`))

afterEach(() => vi.useRealTimers())

describe("nightDay", () => {
  it("de madrugada sigue siendo la noche anterior", () => {
    expect(nightDay(new Date("2025-11-09T02:30:00+01:00"))).toBe("2025-11-08")
    expect(nightDay(new Date("2025-11-09T05:59:00+01:00"))).toBe("2025-11-08")
    expect(nightDay(new Date("2025-11-09T06:00:00+01:00"))).toBe("2025-11-09")
  })
  it("de noche es el mismo día", () => {
    expect(nightDay(new Date("2025-11-08T23:30:00+01:00"))).toBe("2025-11-08")
  })
})

describe("parseNotices", () => {
  it("descarta lo mal formado y ordena", () => {
    const out = parseNotices([
      { id: "b", kind: "closed", from: "2025-11-10", to: "2025-11-09" }, // to < from → una sola noche
      { id: "a", kind: "closed", from: "2025-11-08" },
      { kind: "hours", from: "2025-11-08", open: "25:00", close: "02:00" }, // hora inválida
      { kind: "notice", from: "2025-11-08" }, // sin texto
      { kind: "otra", from: "2025-11-08" },
      "basura",
      null,
    ])
    expect(out.map((n) => n.id)).toEqual(["a", "b"])
    expect(out[1].to).toBe("2025-11-10")
  })
  it("recorta el texto y no revienta con algo que no es una lista", () => {
    expect(parseNotices({})).toEqual([])
    expect(parseNotices(undefined)).toEqual([])
    const long = "x".repeat(500)
    expect(parseNotices([{ kind: "notice", from: "2025-11-08", note: long }])[0].note?.length).toBe(140)
  })
})

describe("avisos activos y próximos", () => {
  const list = [
    { id: "1", kind: "closed", from: "2025-11-08", to: "2025-11-08" },
    { id: "2", kind: "closed", from: "2025-11-15", to: "2025-11-16" },
    { id: "3", kind: "hours", from: "2025-11-12", to: "2025-11-12", open: "20:00", close: "02:00" },
    { id: "4", kind: "closed", from: "2025-12-31", to: "2025-12-31" },
  ]
  it("activos: solo los que cubren esa noche", () => {
    expect(activeNotices(list, "2025-11-08").map((n) => n.id)).toEqual(["1"])
    expect(activeNotices(list, "2025-11-16").map((n) => n.id)).toEqual(["2"])
  })
  it("próximos: dentro de 14 días, sin los de hoy ni los lejanos", () => {
    expect(upcomingNotices(list, "2025-11-08").map((n) => n.id)).toEqual(["3", "2"])
  })
  it("prune quita los pasados", () => {
    expect(pruneNotices(list, "2025-11-10").map((n) => n.id)).toEqual(["3", "2", "4"])
  })
  it("addDays cruza fin de mes y de año", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01")
    expect(addDays("2025-03-01", -1)).toBe("2025-02-28")
  })
})

describe("isClosedTonight / effectiveOpenNow", () => {
  const closedSat = [{ id: "1", kind: "closed", from: "2025-11-08", to: "2025-11-08" }]

  it("cerrado el sábado vale también a las 02:00 del domingo", () => {
    vi.useFakeTimers()
    at("2025-11-09T02:00:00")
    expect(isClosedTonight(closedSat)).toBe(true)
    expect(effectiveOpenNow({ hours: "23:00-06:00", schedule_notices: closedSat })).toBe(false)
  })

  it("sin aviso, manda el horario normal", () => {
    vi.useFakeTimers()
    at("2025-11-08T23:30:00")
    expect(effectiveOpenNow({ hours: "23:00-06:00" })).toBe(true)
    expect(effectiveOpenNow({ hours: "23:00-06:00", schedule_notices: [] })).toBe(true)
  })

  it("cerrado temporalmente gana a todo", () => {
    vi.useFakeTimers()
    at("2025-11-08T23:30:00")
    expect(effectiveOpenNow({ hours: "23:00-06:00", temporarily_closed: true })).toBe(false)
  })

  it("horario especial sustituye al habitual esa noche", () => {
    vi.useFakeTimers()
    const special = [{ id: "h", kind: "hours", from: "2025-11-08", to: "2025-11-08", open: "20:00", close: "23:00" }]
    at("2025-11-08T21:00:00")
    expect(effectiveOpenNow({ hours: "23:00-06:00", schedule_notices: special })).toBe(true)
    at("2025-11-08T23:30:00")
    expect(effectiveOpenNow({ hours: "23:00-06:00", schedule_notices: special })).toBe(false)
  })

  it("un cierre de otra noche no afecta a hoy", () => {
    vi.useFakeTimers()
    at("2025-11-08T23:30:00")
    const next = [{ id: "n", kind: "closed", from: "2025-11-15", to: "2025-11-15" }]
    expect(isClosedTonight(next)).toBe(false)
    expect(effectiveOpenNow({ hours: "23:00-06:00", schedule_notices: next })).toBe(true)
  })
})
