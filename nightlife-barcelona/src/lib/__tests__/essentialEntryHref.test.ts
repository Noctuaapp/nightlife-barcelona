import { describe, expect, it } from "vitest"
import { essentialEntryHref } from "../essentialCategories"

// 19/11/2026: desde Esenciales, en Barcelona, Metro y Nitbus abren primero su portada con todas las líneas; el mapa queda en
// /essentials/metro y /essentials/nitbus, a un botón de distancia. El resto de categorías no cambia.
describe("essentialEntryHref", () => {
  it("en Barcelona, Metro y Nitbus abren la portada de líneas", () => {
    expect(essentialEntryHref("metro", "barcelona")).toBe("/metro")
    expect(essentialEntryHref("nitbus", "barcelona")).toBe("/nitbus")
  })

  it("el resto de categorías siguen yendo a su página de Esenciales", () => {
    expect(essentialEntryHref("pharmacy", "barcelona")).toBe("/essentials/pharmacy")
    expect(essentialEntryHref("taxi", "barcelona")).toBe("/essentials/taxi")
  })

  it("fuera de Barcelona no se toca nada (Madrid tiene sus propias páginas)", () => {
    expect(essentialEntryHref("metro", "madrid")).toBe("/essentials/metro")
    expect(essentialEntryHref("nitbus", "madrid")).toBe("/essentials/nitbus")
  })
})
