import { describe, expect, it } from "vitest"
import { pageLabel, unslug } from "../adminPageLabel"

const NAMES = new Map<string, string>()

describe("pageLabel", () => {
  it("un plan compartido sale sin su código (es la llave del enlace), con 8 o con 12 caracteres", () => {
    expect(pageLabel("/plan/37c2325c", NAMES)).toBe("Plan compartido")
    expect(pageLabel("/plan/37c2325c9a1b", NAMES)).toBe("Plan compartido")
    expect(pageLabel("/plan/37c2325c/", NAMES)).toBe("Plan compartido")
    expect(pageLabel("/plan/37c2325c", NAMES)).not.toMatch(/37c23/)
  })

  it("«Planifica tu noche» (la página sin código) no cambia", () => {
    expect(pageLabel("/plan", NAMES)).toBe("Planifica tu noche")
  })

  it("el resto de rutas con nombre siguen como antes", () => {
    expect(pageLabel("/clubs/sala-apolo", NAMES)).toBe("Club: Sala apolo")
    expect(pageLabel("/musica/techno", NAMES)).toBe("Música: Techno")
    expect(pageLabel("/club-event/123", NAMES)).toBe("Noche de club 123")
    expect(pageLabel("/nitbus/N16", NAMES)).toBe("NitBus: N16")
    expect(pageLabel("/", NAMES)).toBe("Portada")
    expect(pageLabel(null, NAMES)).toBe("—")
  })

  it("un nombre ya conocido manda sobre la regla", () => {
    expect(pageLabel("/plan/abc12345", new Map([["/plan/abc12345", "Cena de cumple"]]))).toBe("Cena de cumple")
  })
})

describe("unslug", () => {
  it("una ruta mal escrita no rompe el panel", () => {
    expect(unslug("%E0%A4")).toBe("%E0%A4")
  })
})
