import { describe, it, expect } from "vitest"
import { homeZoneChips, inZone, HOME_ZONE_MAX } from "../homeZones"

const club = (id: number, neighborhood: string | null) => ({ id, neighborhood })
const many = (n: number, name: string, start = 0) => Array.from({ length: n }, (_, i) => club(start + i, name))

describe("homeZoneChips", () => {
  it("ordena los barrios por número de locales", () => {
    const clubs = [...many(3, "Raval"), ...many(5, "Eixample", 10), ...many(4, "Gràcia", 20)]
    expect(homeZoneChips(clubs).map((z) => z.name)).toEqual(["Eixample", "Gràcia", "Raval"])
  })

  it("no enseña barrios con menos locales que los que piden página propia", () => {
    const clubs = [...many(5, "Eixample"), ...many(2, "Sants", 10), club(99, "Poble-sec")]
    expect(homeZoneChips(clubs).map((z) => z.name)).toEqual(["Eixample"])
  })

  it("descarta «Barcelona» a secas y los locales sin barrio", () => {
    const clubs = [...many(9, "Barcelona"), ...many(3, "Gràcia", 20), club(50, null), club(51, "  ")]
    expect(homeZoneChips(clubs).map((z) => z.slug)).toEqual(["gracia"])
  })

  it("respeta el máximo", () => {
    const clubs = Array.from({ length: 12 }, (_, i) => many(3, `Barrio ${i}`, i * 10)).flat()
    expect(homeZoneChips(clubs)).toHaveLength(HOME_ZONE_MAX)
    expect(homeZoneChips(clubs, 3)).toHaveLength(3)
  })

  it("sin datos devuelve una lista vacía", () => {
    expect(homeZoneChips([])).toEqual([])
  })
})

describe("inZone", () => {
  it("compara por slug, sin importar mayúsculas ni acentos", () => {
    expect(inZone({ neighborhood: "Gràcia" }, "gracia")).toBe(true)
    expect(inZone({ neighborhood: "  Gràcia " }, "gracia")).toBe(true)
    expect(inZone({ neighborhood: "Eixample" }, "gracia")).toBe(false)
  })

  it("un local sin barrio no está en ninguna zona", () => {
    expect(inZone({ neighborhood: null }, "gracia")).toBe(false)
    expect(inZone({}, "gracia")).toBe(false)
    expect(inZone({ neighborhood: "" }, "")).toBe(false)
  })
})
