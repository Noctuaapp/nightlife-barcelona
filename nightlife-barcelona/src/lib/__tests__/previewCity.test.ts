import { describe, expect, it } from "vitest"
import { CITIES, selectableCities, otherCityName } from "../cities"
import { matchPreviewClub } from "../previewClubMatch"

describe("selectableCities", () => {
  it("el público solo puede elegir las ciudades abiertas (hoy, Barcelona)", () => {
    expect(selectableCities(false).map((c) => c.key)).toEqual(["barcelona"])
  })

  it("el admin ve también las que están en vista previa, con Barcelona primero", () => {
    expect(selectableCities(true).map((c) => c.key)).toEqual(["barcelona", "madrid"])
  })

  it("cuando una ciudad deja de estar en prelaunch, sale para todos", () => {
    const original = CITIES.madrid.prelaunch
    CITIES.madrid.prelaunch = false
    try {
      expect(selectableCities(false).map((c) => c.key)).toEqual(["barcelona", "madrid"])
    } finally {
      CITIES.madrid.prelaunch = original
    }
  })
})

describe("otherCityName", () => {
  it("Barcelona y su área no devuelven nada, para que la tarjeta ponga «Barcelona» como siempre", () => {
    expect(otherCityName({ city: "Barcelona" })).toBeNull()
    expect(otherCityName({ city: "L'Hospitalet de Llobregat", latitude: 41.36, longitude: 2.1 })).toBeNull()
    expect(otherCityName({})).toBeNull()
  })

  it("un local de Madrid devuelve «Madrid», por el texto o por las coordenadas", () => {
    expect(otherCityName({ city: "Madrid" })).toBe("Madrid")
    expect(otherCityName({ city: null, latitude: 40.42, longitude: -3.7 })).toBe("Madrid")
  })
})

describe("matchPreviewClub", () => {
  const rows = [
    { id: 1, name: "Teatro Kapital", slug: null },
    { id: 2, name: "Joy Eslava", slug: "joy-eslava-madrid" },
    { id: 3, name: "Café & Copas Ñ", slug: null },
  ]

  it("encuentra por el nombre pasado a slug cuando el local no tiene slug (los importados)", () => {
    expect(matchPreviewClub(rows, "teatro-kapital")?.id).toBe(1)
    expect(matchPreviewClub(rows, "cafe-copas-n")?.id).toBe(3)
  })

  it("encuentra por la columna slug y no distingue mayúsculas ni URL codificada", () => {
    expect(matchPreviewClub(rows, "Joy-Eslava-Madrid")?.id).toBe(2)
    expect(matchPreviewClub(rows, encodeURIComponent("Teatro Kapital"))?.id).toBe(1)
  })

  it("devuelve null si no hay coincidencia o la ruta viene vacía", () => {
    expect(matchPreviewClub(rows, "no-existe")).toBeNull()
    expect(matchPreviewClub(rows, "")).toBeNull()
    expect(matchPreviewClub([], "teatro-kapital")).toBeNull()
  })
})
