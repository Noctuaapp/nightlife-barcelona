import { describe, it, expect } from "vitest"
import { areaHref, zoneSlugByName, zoneNameBySlug, ZONE_SLUGS, ZONE_PAGES } from "../zonePages"
import { zoneOf, ZONES } from "../zones"

describe("areaHref", () => {
  it("lleva los municipios del área metropolitana a su página de zona", () => {
    expect(areaHref("Badalona")).toBe("/zona/badalona")
    expect(areaHref("L'Hospitalet de Llobregat")).toBe("/zona/hospitalet")
    expect(areaHref("Santa Coloma de Gramenet")).toBe("/zona/santa-coloma")
    expect(areaHref("Cornellà de Llobregat")).toBe("/zona/cornella")
    expect(areaHref("Sant Feliu de Llobregat")).toBe("/zona/sant-feliu")
    expect(areaHref("Sant Boi de Llobregat")).toBe("/zona/sant-boi")
  })

  it("deja los barrios de Barcelona en /barrio", () => {
    expect(areaHref("Raval")).toBe("/barrio/raval")
    expect(areaHref("Gràcia")).toBe("/barrio/gracia")
    expect(areaHref("Sant Antoni")).toBe("/barrio/sant-antoni")
    expect(areaHref("Sant Martí")).toBe("/barrio/sant-marti")
    expect(areaHref("Sant Andreu")).toBe("/barrio/sant-andreu")
  })
})

describe("zonas", () => {
  it("cada zona con página tiene su slug y viceversa", () => {
    for (const zone of ZONE_PAGES) expect(zoneSlugByName(zone)).not.toBeNull()
    for (const [slug, zone] of Object.entries(ZONE_SLUGS)) {
      expect(zoneNameBySlug(slug)).toBe(zone)
      expect((ZONES as readonly string[]).includes(zone)).toBe(true)
    }
  })

  it("reconoce Sant Boi por nombre y por código postal", () => {
    expect(zoneOf({ neighborhood: "Sant Boi de Llobregat" })).toBe("Sant Boi de Llobregat")
    expect(zoneOf({ city: "Sant Boi" })).toBe("Sant Boi de Llobregat")
    expect(zoneOf({ address: "Carrer Major 1, 08830 Sant Boi de Llobregat" })).toBe("Sant Boi de Llobregat")
    expect(zoneOf({ address: "Carrer Major 1, 08830" })).toBe("Sant Boi de Llobregat")
  })

  it("Barcelona no tiene página de zona", () => {
    expect(zoneSlugByName("Barcelona")).toBeNull()
    expect(ZONE_PAGES).not.toContain("Barcelona")
  })
})
