import { describe, it, expect } from "vitest"
import { ESSENTIAL_TYPES, essentialAddress, essentialName, isDuplicateEssential, judgeEssential, osmMatches, typesFor } from "../osmEssentials"

const type = (key: string) => ESSENTIAL_TYPES.find((t) => t.key === key)!

describe("judgeEssential", () => {
  it("admite una farmacia de 24 h y guarda su horario", () => {
    const v = judgeEssential(type("pharmacy"), { amenity: "pharmacy", name: "Farmàcia Central", opening_hours: "24/7" })
    expect(v).toEqual({ ok: true, name: "Farmàcia Central", openHours: "Open 24 hours" })
  })

  it("admite un sitio que cierra pasada la 1:00 y descarta uno de horario normal", () => {
    const late = judgeEssential(type("food"), { amenity: "fast_food", name: "Kebab Istanbul", opening_hours: "Mo-Su 12:00-03:00" })
    expect(late).toEqual({ ok: true, name: "Kebab Istanbul", openHours: "Monday to Sunday 12:00 PM – 3:00 AM" })
    expect(judgeEssential(type("food"), { amenity: "restaurant", name: "Casa Pepe", opening_hours: "Mo-Sa 13:00-16:00,20:00-23:30" })).toEqual({ ok: false, reason: "no_es_de_noche" })
  })

  it("sin horario no entra, salvo cajeros de calle y hospitales con urgencias", () => {
    expect(judgeEssential(type("supermarket"), { shop: "convenience", name: "Colmado" })).toEqual({ ok: false, reason: "sin_horario" })
    expect(judgeEssential(type("gas"), { amenity: "fuel", name: "Repsol" })).toEqual({ ok: false, reason: "sin_horario" })
    expect(judgeEssential(type("atm"), { amenity: "atm", operator: "CaixaBank" })).toEqual({ ok: true, name: "CaixaBank", openHours: null })
    expect(judgeEssential(type("atm"), { amenity: "atm", operator: "CaixaBank", indoor: "yes" })).toEqual({ ok: false, reason: "sin_horario" })
    expect(judgeEssential(type("hospital"), { amenity: "hospital", name: "Hospital del Mar", emergency: "yes" })).toEqual({ ok: true, name: "Hospital del Mar", openHours: null })
    expect(judgeEssential(type("hospital"), { amenity: "hospital", name: "Clínica X" })).toEqual({ ok: false, reason: "sin_horario" })
  })

  it("un horario que no entiende no se inventa", () => {
    expect(judgeEssential(type("pharmacy"), { amenity: "pharmacy", name: "Farmàcia", opening_hours: "Mo-Fr sunrise-sunset" })).toEqual({ ok: false, reason: "horario_no_entendido" })
  })

  it("descarta lo que no es público o no tiene nombre", () => {
    expect(judgeEssential(type("atm"), { amenity: "atm", access: "customers" })).toEqual({ ok: false, reason: "no_es_publico" })
    expect(judgeEssential(type("pharmacy"), { amenity: "pharmacy", opening_hours: "24/7" })).toEqual({ ok: false, reason: "sin_nombre" })
  })

  it("un cajero sin ningún nombre se llama «Cajero automático»", () => {
    expect(judgeEssential(type("atm"), { amenity: "atm" })).toEqual({ ok: true, name: "Cajero automático", openHours: null })
  })
})

describe("nombres y direcciones", () => {
  it("usa el nombre, y si no la marca o el operador", () => {
    expect(essentialName({ name: "  Mercadona  " })).toBe("Mercadona")
    expect(essentialName({ brand: "Bon Preu" })).toBe("Bon Preu")
    expect(essentialName({ operator: "Euronet" })).toBe("Euronet")
    expect(essentialName({})).toBeNull()
  })

  it("monta la dirección con calle, número, código postal y municipio", () => {
    expect(essentialAddress({ "addr:street": "Carrer Mallorca", "addr:housenumber": "12", "addr:postcode": "08910" }, "Badalona")).toBe("Carrer Mallorca, 12, 08910, Badalona")
    expect(essentialAddress({}, "Badalona")).toBeNull()
  })
})

describe("isDuplicateEssential", () => {
  const existing = [{ category: "Supermarket", norm: "mercadona", lat: 41.4, lon: 2.2 }]

  it("el mismo sitio a pocos metros, aunque cambie el nombre", () => {
    expect(isDuplicateEssential(existing, { category: "Supermarket", name: "Super 24h", lat: 41.40005, lon: 2.20005 })).toBe(true)
  })

  it("mismo nombre a menos de 150 m es el mismo; a 500 m es otro Mercadona", () => {
    expect(isDuplicateEssential(existing, { category: "Supermarket", name: "Mercadona", lat: 41.4009, lon: 2.2 })).toBe(true)
    expect(isDuplicateEssential(existing, { category: "Supermarket", name: "Mercadona", lat: 41.4045, lon: 2.2 })).toBe(false)
  })

  it("otra categoría nunca es duplicado", () => {
    expect(isDuplicateEssential(existing, { category: "Pharmacy", name: "Mercadona", lat: 41.4, lon: 2.2 })).toBe(false)
  })
})

describe("parkings gratuitos", () => {
  const parking = type("parking")

  it("admite un parking público con fee=no, sin horario", () => {
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", name: "Aparcament Fòrum" })).toEqual({ ok: true, name: "Aparcament Fòrum", openHours: null })
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", access: "yes", parking: "surface" })).toEqual({ ok: true, name: "Aparcamiento gratuito", openHours: null })
  })

  it("sin nombre usa la calle si la hay, y nunca la marca o el operador", () => {
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", "addr:street": "Carrer de Llull", operator: "Ajuntament de Barcelona" })).toEqual({
      ok: true, name: "Aparcamiento gratuito · Carrer de Llull", openHours: null,
    })
  })

  it("sin fee=no explícito no entra (no se sabe si es gratis)", () => {
    expect(judgeEssential(parking, { amenity: "parking", name: "Parking Plaza" })).toEqual({ ok: false, reason: "no_es_gratis" })
    expect(judgeEssential(parking, { amenity: "parking", fee: "yes", name: "Parking Plaza" })).toEqual({ ok: false, reason: "no_es_gratis" })
  })

  it("descarta los que no son de uso general", () => {
    for (const access of ["private", "customers", "permit", "residents", "employees", "delivery"]) {
      expect(judgeEssential(parking, { amenity: "parking", fee: "no", access })).toEqual({ ok: false, reason: "no_es_publico" })
    }
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", name: "Parking privado Mercadona" })).toEqual({ ok: false, reason: "no_es_publico" })
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", name: "Pàrquing clients" })).toEqual({ ok: false, reason: "no_es_publico" })
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", motorcar: "no" })).toEqual({ ok: false, reason: "no_es_para_coches" })
  })

  it("se reconoce en OpenStreetMap, no entra en «all» y se pide con cat=parking", () => {
    expect(osmMatches("parking", { amenity: "parking" })).toBe(true)
    expect(osmMatches("parking", { amenity: "fuel" })).toBe(false)
    expect(typesFor("all").map((t) => t.key)).not.toContain("parking")
    expect(typesFor("parking").map((t) => t.category)).toEqual(["Parking"])
    expect(parking.selectors).toEqual([`["amenity"="parking"]["fee"="no"]`])
  })
})

describe("tipos", () => {
  it("«all» da los seis y una categoría suelta da solo esa", () => {
    expect(typesFor("all")).toHaveLength(6)
    expect(typesFor("atm").map((t) => t.category)).toEqual(["ATM"])
    expect(typesFor("hoteles")).toEqual([])
  })

  it("reconoce cada elemento de OpenStreetMap en su categoría", () => {
    expect(osmMatches("food", { amenity: "fast_food" })).toBe(true)
    expect(osmMatches("supermarket", { shop: "convenience" })).toBe(true)
    expect(osmMatches("gas", { amenity: "fuel" })).toBe(true)
    expect(osmMatches("pharmacy", { amenity: "atm" })).toBe(false)
  })
})
