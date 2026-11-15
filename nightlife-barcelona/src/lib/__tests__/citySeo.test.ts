import { describe, expect, it } from "vitest"
import { CITIES } from "../cities"
import { cityBaseMetadata, cityHeroUrl, cityHomeMetadata, cityRobots } from "../citySeo"

describe("citySeo", () => {
  it("una ciudad en prelaunch no se indexa; abierta, no añade ninguna regla", () => {
    const original = CITIES.madrid.prelaunch
    try {
      CITIES.madrid.prelaunch = true
      expect(cityRobots("madrid")).toEqual({ robots: { index: false, follow: false } })
      CITIES.madrid.prelaunch = false
      expect(cityRobots("madrid")).toEqual({})
    } finally {
      CITIES.madrid.prelaunch = original
    }
    expect(cityRobots("barcelona")).toEqual({})
  })

  it("la portada de Madrid habla de Madrid, no de Barcelona, y usa su foto", () => {
    const m = cityHomeMetadata("madrid")
    const text = JSON.stringify(m)
    expect(text).not.toMatch(/Barcelona/)
    expect(m.title).toBe("Noctua — Vida nocturna en Madrid")
    expect(cityHeroUrl("madrid")).toBe("https://www.noctuaapp.com/hero/skyline_madrid.jpeg")
    expect(m.openGraph?.url).toBe("https://www.noctuaapp.com/madrid")
    expect(m.alternates?.canonical).toBe("./")
  })

  it("los metadatos de partida de Madrid no heredan nada de Barcelona y no fijan canonical ni og:url (son de cada página)", () => {
    const m = cityBaseMetadata("madrid")
    expect(JSON.stringify(m)).not.toMatch(/Barcelona/)
    expect(m.keywords).toContain("discotecas Madrid")
    expect(m.openGraph?.url).toBeUndefined()
    expect(m.alternates).toBeUndefined()
    expect(m.twitter?.images).toEqual(["https://www.noctuaapp.com/hero/skyline_madrid.jpeg"])
  })
})
