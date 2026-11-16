import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { PLAN_BACKDROP_STYLE, PLAN_OWL_STYLE } from "../../components/plan/planBackdrop"

// Fondo de «Planifica tu noche» (16/11/2026): azul noche oscuro (no el índigo violeta, que se confundía con los botones) y el
// búho del logo detrás del título.
const ROOT = join(__dirname, "..", "..", "..")

describe("fondo de Planifica tu noche", () => {
  it("el búho del fondo existe en public/ y lo usa la capa", () => {
    const m = /url\((\/[^)]+)\)/.exec(String(PLAN_OWL_STYLE.backgroundImage))
    expect(m).not.toBeNull()
    expect(existsSync(join(ROOT, "public", m![1]))).toBe(true)
  })

  it("el búho es tenue: no compite con el texto", () => {
    expect(Number(PLAN_OWL_STYLE.opacity)).toBeGreaterThan(0.08)
    expect(Number(PLAN_OWL_STYLE.opacity)).toBeLessThanOrEqual(0.3)
  })

  it("el fondo ya no es el índigo violeta de los botones", () => {
    const bg = String(PLAN_BACKDROP_STYLE.backgroundImage).toLowerCase()
    expect(bg).not.toContain("#31258a")
    expect(bg).not.toContain("124,92,255") // el violeta de marca (brand) en el resplandor
  })

  it("la página pone la capa del búho dentro de un <main> con isolate", () => {
    const src = readFileSync(join(ROOT, "src", "app", "plan", "page.tsx"), "utf8")
    expect(src).toMatch(/<main className="relative isolate /)
    expect(src).toContain("style={PLAN_OWL_STYLE}")
  })
})
