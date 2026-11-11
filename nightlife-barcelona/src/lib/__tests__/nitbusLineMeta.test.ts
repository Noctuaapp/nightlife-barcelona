import { describe, expect, it, vi } from "vitest"

// Metadatos de /nitbus/[line] para una línea que no está en el catálogo (11/11/2026): con paradas en los datos se
// abre pero no se indexa; sin ellas la página da 404 (notFound) y aquí solo importa que tampoco se indexe.
vi.mock("../nitbusRoutes", () => ({
  loadNitbusData: async () => ({ lines: { N62: { stopCount: 12 } } }),
  compareLineCodes: () => 0,
}))
vi.mock("../../components/nitbus/NitbusLineView", () => ({ default: () => null }))

import { generateMetadata } from "../../app/nitbus/[line]/page"

const meta = (line: string) => generateMetadata({ params: Promise.resolve({ line }) })

describe("generateMetadata de /nitbus/[line]", () => {
  it("una línea con paradas pero fuera del catálogo lleva título propio y noindex", async () => {
    const m = await meta("n62")
    expect(m.title).toBe("Nitbus N62: paradas | Noctua")
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it("una línea que no existe no se indexa", async () => {
    const m = await meta("N999")
    expect(m.title).toBe("Línea no encontrada | Noctua")
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it("una línea del catálogo sigue indexable, con su título de siempre", async () => {
    const m = await meta("N11")
    expect(String(m.title)).toMatch(/^Nitbus N11: paradas y recorrido \(/)
    expect(m.robots).toBeUndefined()
  })
})
