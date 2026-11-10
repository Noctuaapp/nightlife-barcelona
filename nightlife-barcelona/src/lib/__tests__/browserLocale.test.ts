import { describe, it, expect } from "vitest"
import { pickLocaleFromBrowser } from "../browserLocale"

describe("pickLocaleFromBrowser", () => {
  it("usa el primer idioma del navegador que tiene la web", () => {
    expect(pickLocaleFromBrowser(["de-DE", "en"])).toBe("de")
    expect(pickLocaleFromBrowser(["fr-CA"])).toBe("fr")
    expect(pickLocaleFromBrowser(["pt-BR"])).toBe("pt")
    expect(pickLocaleFromBrowser(["nl"])).toBe("nl")
    expect(pickLocaleFromBrowser(["it_IT"])).toBe("it")
    expect(pickLocaleFromBrowser(["ca-ES", "es"])).toBe("ca")
    expect(pickLocaleFromBrowser(["es-MX"])).toBe("es")
  })
  it("salta los idiomas que la web no tiene mientras haya otro que sí", () => {
    expect(pickLocaleFromBrowser(["ja-JP", "en-US"])).toBe("en")
    expect(pickLocaleFromBrowser(["ru", "de"])).toBe("de")
  })
  it("si no hay ninguno, inglés; y para quien habla euskera o gallego, español", () => {
    expect(pickLocaleFromBrowser(["ja", "zh-CN"])).toBe("en")
    expect(pickLocaleFromBrowser(["ar"])).toBe("en")
    expect(pickLocaleFromBrowser(["eu"])).toBe("es")
    expect(pickLocaleFromBrowser(["gl-ES", "en"])).toBe("es")
  })
  it("sin datos, español", () => {
    expect(pickLocaleFromBrowser([])).toBe("es")
    expect(pickLocaleFromBrowser(null)).toBe("es")
    expect(pickLocaleFromBrowser([""])).toBe("en")
  })
})
