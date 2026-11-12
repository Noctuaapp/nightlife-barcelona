import { describe, it, expect } from "vitest"
import { ANNOUNCEMENTS, TIPS, activeMessages, isInWindow, shuffled, type HomeMessage } from "../homeMessages"

const NOON = new Date("2026-12-10T12:00:00Z")
const promo = (o: Partial<HomeMessage> = {}): HomeMessage => ({ id: "p", kind: "promo", text: { literal: "x" }, sponsor: "Marca", ...o })

describe("isInWindow", () => {
  it("sin fechas, siempre", () => expect(isInWindow({}, NOON)).toBe(true))
  it("respeta inicio y fin (ambos días incluidos)", () => {
    expect(isInWindow({ startsAt: "2026-12-10" }, NOON)).toBe(true)
    expect(isInWindow({ startsAt: "2026-12-11" }, NOON)).toBe(false)
    expect(isInWindow({ endsAt: "2026-12-10" }, NOON)).toBe(true)
    expect(isInWindow({ endsAt: "2026-12-09" }, NOON)).toBe(false)
  })
  it("usa el día de Madrid, no el de UTC", () => {
    // 23:30 UTC del 10/12 ya es 11/12 en Madrid (invierno, UTC+1)
    expect(isInWindow({ startsAt: "2026-12-11" }, new Date("2026-12-10T23:30:00Z"))).toBe(true)
  })
})

describe("activeMessages", () => {
  it("los anuncios van antes que los consejos", () => {
    const list = activeMessages(NOON, { clubNoctua: true, announcements: [promo({ id: "a" })] })
    expect(list[0].id).toBe("a")
    expect(list.slice(1).every((m) => m.kind === "tip")).toBe(true)
  })
  it("un anuncio fuera de fechas no sale", () => {
    const list = activeMessages(NOON, { clubNoctua: true, announcements: [promo({ endsAt: "2026-12-01" })] })
    expect(list.some((m) => m.kind === "promo")).toBe(false)
  })
  it("los consejos de niveles y XP no salen si Club Noctua está apagado", () => {
    const off = activeMessages(NOON, { clubNoctua: false })
    const on = activeMessages(NOON, { clubNoctua: true })
    expect(on.length).toBeGreaterThan(off.length)
    expect(off.some((m) => m.needsClubNoctua)).toBe(false)
  })
  it("con la lista real no sale ningún anuncio (está vacía a propósito)", () => {
    expect(ANNOUNCEMENTS).toHaveLength(0)
    expect(activeMessages(NOON, { clubNoctua: true }).every((m) => m.kind === "tip")).toBe(true)
  })
  it("los ids no se repiten y cada consejo apunta a una clave de traducción", () => {
    const ids = TIPS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(TIPS.every((m) => "key" in m.text && m.text.key.startsWith("homeTicker.msg"))).toBe(true)
  })
  it("los enlaces de los consejos son rutas internas", () => {
    for (const m of TIPS) if (m.cta) expect(m.cta.href.startsWith("/")).toBe(true)
  })
})

describe("shuffled", () => {
  it("no pierde ni repite elementos y no toca el original", () => {
    const src = [1, 2, 3, 4, 5, 6]
    const out = shuffled(src, () => 0.3)
    expect([...out].sort()).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5, 6])
  })
})
