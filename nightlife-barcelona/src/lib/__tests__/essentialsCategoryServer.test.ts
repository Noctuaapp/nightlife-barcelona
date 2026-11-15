import { describe, expect, it, vi } from "vitest"

// La parte de servidor de las categorías de esenciales no necesita base de datos para estas pruebas.
vi.mock("../supabase", () => ({ supabase: {} }))

import { essentialCategoryParams, essentialsCategoryMetadata, sitemapEssentialSlugs } from "../../components/city/EssentialsCategoryServer"

const slugs = (city: "barcelona" | "madrid") => essentialCategoryParams(city).map((p) => p.category)
const meta = (city: "barcelona" | "madrid", category: string) => essentialsCategoryMetadata(city, { params: Promise.resolve({ category }) })

describe("categorías de esenciales por ciudad", () => {
  it("Barcelona conserva las suyas (metro, nitbus, bicing, parking) y no tiene BiciMAD ni estancos", () => {
    const b = slugs("barcelona")
    for (const c of ["pharmacy", "metro", "nitbus", "taxi", "parking", "bicing", "police"]) expect(b).toContain(c)
    expect(b).not.toContain("bicimad")
    expect(b).not.toContain("tobacco")
  })

  it("Madrid no tiene el metro, el Nitbus, Bicing ni el parking gratuito de Barcelona, y sí BiciMAD", () => {
    const m = slugs("madrid")
    for (const c of ["metro", "nitbus", "bicing", "parking"]) expect(m).not.toContain(c)
    for (const c of ["pharmacy", "atm", "food", "taxi", "supermarket", "hospital", "bicimad", "police", "tobacco"]) expect(m).toContain(c)
  })

  it("los títulos y descripciones de Madrid hablan de Madrid, nunca de Barcelona ni de sus cuerpos de policía", async () => {
    for (const c of slugs("madrid")) {
      const text = JSON.stringify(await meta("madrid", c))
      expect(text, c).not.toMatch(/Barcelona|Guardia Urbana|Mossos|NitBus/i)
      expect(text, c).toMatch(/Madrid/)
    }
  })

  it("Barcelona sigue con sus títulos de siempre y su hreflang en inglés", async () => {
    const m = await meta("barcelona", "pharmacy")
    expect(m.title).toBe("Farmacias de guardia y 24 h en Barcelona | Noctua")
    expect(m.description).toBe("Farmacias abiertas ahora y de guardia por la noche en Barcelona, con mapa y cómo llegar.")
    expect(JSON.stringify(m.alternates)).toContain("/en/essentials/pharmacy")
  })

  it("Madrid solo tiene versión en español y su propia dirección", async () => {
    const m = await meta("madrid", "pharmacy")
    expect(m.alternates).toEqual({ canonical: "https://www.noctuaapp.com/madrid/essentials/pharmacy" })
  })

  it("mientras Madrid esté en prelaunch no se indexa; BiciMAD y las categorías nuevas nunca", async () => {
    expect((await meta("madrid", "pharmacy")).robots).toEqual({ index: false, follow: false })
    expect((await meta("barcelona", "pharmacy")).robots).toBeUndefined()
    expect((await meta("barcelona", "bicing")).robots).toEqual({ index: false, follow: true })
    expect((await meta("madrid", "tobacco")).robots).toEqual({ index: false, follow: false })
  })

  it("el sitemap de Madrid solo lleva categorías con datos suficientes, nunca las de Barcelona, las noindex ni «transport»", () => {
    const counts = { pharmacy: 40, atm: 12, food: 0, taxi: 2, hospital: 6, supermarket: 9, "gas-station": 1, metro: 30, nitbus: 30, bicimad: 300, police: 8, tobacco: 12, transport: 5 }
    const m = sitemapEssentialSlugs("madrid", counts)
    expect(m.sort()).toEqual(["atm", "gas-station", "hospital", "pharmacy", "supermarket"])
    expect(sitemapEssentialSlugs("madrid", {})).toEqual([])
  })
})
