import { describe, expect, it } from "vitest"
import { clubInsider, hasInsider, insiderLines, insiderText, INSIDER_MAX_LINES } from "../clubInsider"

describe("insiderLines", () => {
  it("separa por líneas y quita viñetas escritas a mano", () => {
    expect(insiderLines("- Buen sonido\n• Terraza grande\n* Barra rápida")).toEqual(["Buen sonido", "Terraza grande", "Barra rápida"])
  })
  it("no se come un guion pegado al texto", () => {
    expect(insiderLines("-18 no entran")).toEqual(["-18 no entran"])
  })
  it("ignora líneas vacías y espacios", () => {
    expect(insiderLines("  Uno  \n\n   \r\nDos\r\n")).toEqual(["Uno", "Dos"])
  })
  it("se queda con las primeras cinco", () => {
    const raw = Array.from({ length: 9 }, (_, i) => `Frase ${i + 1}`).join("\n")
    const out = insiderLines(raw)
    expect(out).toHaveLength(INSIDER_MAX_LINES)
    expect(out[0]).toBe("Frase 1")
  })
  it("recorta una frase larguísima", () => {
    const out = insiderLines("a".repeat(500))
    expect(out[0].length).toBeLessThanOrEqual(220)
    expect(out[0].endsWith("…")).toBe(true)
  })
  it("devuelve vacío si no es texto", () => {
    expect(insiderLines(null)).toEqual([])
    expect(insiderLines(undefined)).toEqual([])
    expect(insiderLines(42)).toEqual([])
  })
})

describe("insiderText", () => {
  it("junta saltos de línea y espacios", () => {
    expect(insiderText("  Llega\n antes   de las 2  ")).toBe("Llega antes de las 2")
  })
  it("devuelve vacío si no es texto", () => {
    expect(insiderText(null)).toBe("")
    expect(insiderText({})).toBe("")
  })
})

describe("hasInsider / clubInsider", () => {
  it("sin datos no hay bloque", () => {
    expect(hasInsider({})).toBe(false)
    expect(hasInsider(null)).toBe(false)
    expect(hasInsider({ highlights: "  \n ", tip: "   ", peak_hours: "" })).toBe(false)
  })
  it("basta con un solo campo", () => {
    expect(hasInsider({ peak_hours: "02:30 – 05:00" })).toBe(true)
    expect(hasInsider({ watchouts: "Cola larga" })).toBe(true)
  })
  it("lee los cinco campos", () => {
    const d = clubInsider({ highlights: "A\nB", watchouts: "C", tip: "D", peak_hours: "E", audience: "F" })
    expect(d).toEqual({ best: ["A", "B"], watch: ["C"], tip: "D", peak: "E", audience: "F" })
  })
})
