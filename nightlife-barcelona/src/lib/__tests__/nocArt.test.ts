import { describe, expect, it } from "vitest"
import { NOC_DEFAULT_COLOR, NOC_POSES, nocSvg, safeColor, type NocTheme } from "../nocArt"

const THEMES: NocTheme[] = [
  "sanValentin", "carnaval", "semanaSanta", "feriaAbril", "santJordi", "sanJuan", "pride", "summer", "merce", "halloween", "christmas",
]

describe("nocArt", () => {
  it("solo acepta colores #rrggbb; lo demás cae al violeta de marca", () => {
    expect(safeColor("#eab308")).toBe("#eab308")
    expect(safeColor("red")).toBe(NOC_DEFAULT_COLOR)
    expect(safeColor('#fff"/><script>')).toBe(NOC_DEFAULT_COLOR)
    expect(safeColor(undefined)).toBe(NOC_DEFAULT_COLOR)
  })

  it("el color del nivel entra en el dibujo y uno inválido no", () => {
    expect(nocSvg({ color: "#eab308" })).toContain("#eab308")
    const bad = nocSvg({ color: '"><script>alert(1)</script>' })
    expect(bad).not.toContain("script")
    expect(bad).toContain(NOC_DEFAULT_COLOR)
  })

  it("limpia el id que se usa en los recortes", () => {
    const out = nocSvg({ id: 'a"b:c' })
    expect(out).toContain('id="abcc"')
    expect(out).toContain("url(#abcc)")
  })

  it("todas las poses y todos los disfraces pintan algo propio", () => {
    const base = nocSvg()
    for (const pose of NOC_POSES) expect(nocSvg({ pose }).length, pose).toBeGreaterThan(base.length)
    for (const theme of THEMES) expect(nocSvg({ theme }).length, theme).toBeGreaterThan(base.length - 400)
  })

  it("con pose no se pinta el disfraz", () => {
    expect(nocSvg({ pose: "copa", theme: "christmas" })).toBe(nocSvg({ pose: "copa" }))
  })

  it("es determinista (mismo dibujo en servidor y navegador)", () => {
    expect(nocSvg({ mood: "party", theme: "sanJuan", id: "x" })).toBe(nocSvg({ mood: "party", theme: "sanJuan", id: "x" }))
  })
})
