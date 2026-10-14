import { describe, it, expect } from "vitest"
import { createSlug } from "../slug"

describe("createSlug", () => {
  it("quita acentos y símbolos", () => {
    expect(createSlug("NIGHT & DAY BCN")).toBe("night-day-bcn")
    expect(createSlug("Sala Apolo · Barcelona")).toBe("sala-apolo-barcelona")
    expect(createSlug("Dr. Stravinsky")).toBe("dr-stravinsky")
    expect(createSlug("L'Hospitalet de Llobregat")).toBe("l-hospitalet-de-llobregat")
  })
  it("tolera valores vacíos", () => {
    expect(createSlug(null)).toBe("")
    expect(createSlug("  ")).toBe("")
  })
})
