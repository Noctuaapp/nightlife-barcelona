import { describe, it, expect } from "vitest"
import { ESSENTIAL_TYPES, essentialAddress, essentialContact, essentialName, isDuplicateEssential, judgeEssential, osmMatches, osmSourceUrl, typesFor } from "../osmEssentials"

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

  it("descarta los de camiones y autobuses, que no son para un coche", () => {
    const casos: Record<string, string>[] = [{ name: "Truck Parking" }, { name: "Aparcament de camions" }, { name: "Aparcamiento autobuses" }, { hgv: "designated" }, { hgv: "only" }]
    for (const tags of casos) {
      expect(judgeEssential(parking, { amenity: "parking", fee: "no", ...tags })).toEqual({ ok: false, reason: "no_es_para_coches" })
    }
    // un parking normal que también admite camiones (hgv=yes), o con «bus» dentro de otra palabra, sigue entrando
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", hgv: "yes", name: "Aparcament Fòrum" }).ok).toBe(true)
    expect(judgeEssential(parking, { amenity: "parking", fee: "no", name: "Parc de Bellvitge" }).ok).toBe(true)
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

describe("categorías nuevas · paradas de taxi", () => {
  const taxi = type("taxi")
  it("una parada entra sin horario; sin nombre se llama «Parada de taxi» y la calle si la hay", () => {
    expect(judgeEssential(taxi, { amenity: "taxi", name: "Parada de Taxis Plaça Catalunya" })).toEqual({ ok: true, name: "Parada de Taxis Plaça Catalunya", openHours: null })
    expect(judgeEssential(taxi, { amenity: "taxi" })).toEqual({ ok: true, name: "Parada de taxi", openHours: null })
    expect(judgeEssential(taxi, { amenity: "taxi", "addr:street": "Carrer d'Aragó" })).toEqual({ ok: true, name: "Parada de taxi · Carrer d'Aragó", openHours: null })
  })
  it("no usa el operador como nombre y descarta oficinas de apps y paradas privadas", () => {
    expect(judgeEssential(taxi, { amenity: "taxi", operator: "Radio Taxi" })).toEqual({ ok: true, name: "Parada de taxi", openHours: null })
    expect(judgeEssential(taxi, { amenity: "taxi", name: "Cabify oficina" })).toEqual({ ok: false, reason: "no_es_una_parada" })
    expect(judgeEssential(taxi, { amenity: "taxi", name: "Uber Hub" })).toEqual({ ok: false, reason: "no_es_una_parada" })
    expect(judgeEssential(taxi, { amenity: "taxi", access: "private" })).toEqual({ ok: false, reason: "no_es_publico" })
  })
})

describe("categorías nuevas · veterinarios", () => {
  const vet = type("veterinary")
  it("solo urgencias u horario de noche; un veterinario de día no entra", () => {
    expect(judgeEssential(vet, { amenity: "veterinary", name: "Hospital Veterinari", opening_hours: "24/7" })).toEqual({ ok: true, name: "Hospital Veterinari", openHours: "Open 24 hours", attrs: {} })
    expect(judgeEssential(vet, { amenity: "veterinary", name: "Urgències Vet", emergency: "yes" })).toEqual({ ok: true, name: "Urgències Vet", openHours: null, attrs: { emergency: true } })
    expect(judgeEssential(vet, { amenity: "veterinary", name: "Clínica Veterinària", opening_hours: "Mo-Fr 09:00-20:00" })).toEqual({ ok: false, reason: "no_es_de_noche" })
    expect(judgeEssential(vet, { amenity: "veterinary", name: "Clínica Veterinària" })).toEqual({ ok: false, reason: "sin_horario" })
    expect(judgeEssential(vet, { amenity: "veterinary", opening_hours: "24/7" })).toEqual({ ok: false, reason: "sin_nombre" })
  })
})

describe("categorías nuevas · aseos públicos", () => {
  const wc = type("toilets")
  it("entra con horario de día (la web dirá si está abierto) y guarda gratuidad y accesibilidad", () => {
    const v = judgeEssential(wc, { amenity: "toilets", name: "Aseos Parc de la Ciutadella", opening_hours: "Mo-Su 08:00-20:00", fee: "no", wheelchair: "yes" })
    expect(v).toEqual({ ok: true, name: "Aseos Parc de la Ciutadella", openHours: "Monday to Sunday 8:00 AM – 8:00 PM", attrs: { fee: false, wheelchair: "yes" } })
  })
  it("sin horario entra si está en la calle (queda «sin confirmar»), no si está dentro de un edificio", () => {
    expect(judgeEssential(wc, { amenity: "toilets", "addr:street": "Passeig de Gràcia" })).toEqual({ ok: true, name: "Aseos públicos · Passeig de Gràcia", openHours: null, attrs: {} })
    expect(judgeEssential(wc, { amenity: "toilets", indoor: "yes" })).toEqual({ ok: false, reason: "sin_horario" })
  })
  it("descarta los de clientes y los privados", () => {
    expect(judgeEssential(wc, { amenity: "toilets", access: "customers" })).toEqual({ ok: false, reason: "no_es_publico" })
    expect(judgeEssential(wc, { amenity: "toilets", access: "private" })).toEqual({ ok: false, reason: "no_es_publico" })
  })
  it("un horario que no entiende se queda vacío, no se inventa", () => {
    expect(judgeEssential(wc, { amenity: "toilets", name: "WC", opening_hours: "sunrise-sunset" })).toEqual({ ok: true, name: "WC", openHours: null, attrs: {} })
  })
})

describe("categorías nuevas · máquinas expendedoras", () => {
  const vm = type("vending")
  it("clasifica por producto y pone nombre con la calle", () => {
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "drinks", "addr:street": "Carrer Joaquín Costa" })).toEqual({
      ok: true, name: "Máquina de bebidas · Carrer Joaquín Costa", openHours: null, subcategory: "Bebidas", attrs: { products: ["drinks"] },
    })
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "sweets;drinks", brand: "Vendomat" })).toMatchObject({ ok: true, subcategory: "Bebidas", name: "Máquina de bebidas · Vendomat" })
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "sweets" })).toMatchObject({ ok: true, subcategory: "Comida y snacks" })
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "coffee" })).toMatchObject({ ok: true, subcategory: "Café" })
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "condoms" })).toMatchObject({ ok: true, subcategory: "Higiene" })
  })
  it("no son útiles de noche las de billetes, tabaco, cargadores de móvil o sin producto", () => {
    for (const vending of ["public_transport_tickets", "parking_tickets", "cigarettes", "excrement_bags", "phone_chargers", "mobile_phone_charging"]) {
      expect(judgeEssential(vm, { amenity: "vending_machine", vending })).toEqual({ ok: false, reason: "producto_no_util" })
    }
    expect(judgeEssential(vm, { amenity: "vending_machine" })).toEqual({ ok: false, reason: "producto_no_util" })
  })
  it("dentro de un local y sin horario no entra; con horario sí", () => {
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "drinks", indoor: "yes" })).toEqual({ ok: false, reason: "sin_horario" })
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "drinks", indoor: "yes", opening_hours: "24/7" })).toMatchObject({ ok: true, openHours: "Open 24 hours" })
    expect(judgeEssential(vm, { amenity: "vending_machine", vending: "drinks", access: "customers" })).toEqual({ ok: false, reason: "no_es_publico" })
  })
})

describe("categorías nuevas · consignas, comisarías y Bicing", () => {
  it("consigna: nombre u operador, y si es de taquillas", () => {
    expect(judgeEssential(type("luggage"), { amenity: "luggage_locker", operator: "Lockers Sants", fee: "yes" })).toEqual({ ok: true, name: "Lockers Sants", openHours: null, attrs: { kind: "locker", fee: true } })
    expect(judgeEssential(type("luggage"), { amenity: "left_luggage", access: "private" })).toEqual({ ok: false, reason: "no_es_publico" })
  })
  it("comisaría: reconoce el cuerpo y descarta cuarteles y depósitos", () => {
    expect(judgeEssential(type("police"), { amenity: "police", name: "Comissaria de la Guàrdia Urbana de Ciutat Vella", opening_hours: "24/7" })).toEqual({
      ok: true, name: "Comissaria de la Guàrdia Urbana de Ciutat Vella", openHours: "Open 24 hours", subcategory: "Guardia Urbana",
    })
    expect(judgeEssential(type("police"), { amenity: "police", operator: "Mossos d'Esquadra" })).toMatchObject({ ok: true, name: "Mossos d'Esquadra", subcategory: "Mossos d'Esquadra" })
    expect(judgeEssential(type("police"), { amenity: "police" })).toMatchObject({ ok: true, name: "Comisaría", subcategory: null })
    expect(judgeEssential(type("police"), { amenity: "police", police: "car_pound", name: "Dipòsit" })).toEqual({ ok: false, reason: "no_es_comisaria" })
    expect(judgeEssential(type("police"), { amenity: "police", police: "barracks" })).toEqual({ ok: false, reason: "no_es_comisaria" })
  })
  it("Bicing: solo ubicación, con capacidad y número si los hay", () => {
    expect(judgeEssential(type("bicing"), { amenity: "bicycle_rental", network: "Bicing", name: "C/ Aragó, 120", capacity: "27", ref: "123" })).toEqual({
      ok: true, name: "Bicing · C/ Aragó, 120", openHours: null, subcategory: "Estación", attrs: { capacity: 27, ref: "123" },
    })
    expect(judgeEssential(type("bicing"), { amenity: "bicycle_rental", operator: "Bicing", "addr:street": "Carrer de Mallorca" })).toMatchObject({ name: "Bicing · Carrer de Mallorca" })
    expect(judgeEssential(type("bicing"), { amenity: "bicycle_rental", network: "Bicing", name: "Bicing 45" })).toMatchObject({ name: "Bicing 45" })
  })
  it("Bicing solo cuenta si es de Bicing; otros alquileres de bicis no", () => {
    expect(osmMatches("bicing", { amenity: "bicycle_rental", network: "Bicing" })).toBe(true)
    expect(osmMatches("bicing", { amenity: "bicycle_rental", operator: "Barcelona de Serveis Municipals · BICING" })).toBe(true)
    expect(osmMatches("bicing", { amenity: "bicycle_rental", operator: "Donkey Republic" })).toBe(false)
    expect(osmMatches("bicing", { amenity: "bicycle_rental" })).toBe(false)
  })
})

describe("categorías nuevas · piezas comunes", () => {
  it("las nuevas se piden de una en una y no entran en «all»", () => {
    const all = typesFor("all").map((t) => t.key)
    for (const k of ["taxi", "veterinary", "toilets", "vending", "luggage", "police", "bicing", "parking"]) expect(all).not.toContain(k)
    for (const k of ["taxi", "veterinary", "toilets", "vending", "luggage", "police", "bicing"]) expect(typesFor(k)).toHaveLength(1)
  })
  it("cada elemento de OpenStreetMap se reconoce en su categoría", () => {
    expect(osmMatches("taxi", { amenity: "taxi" })).toBe(true)
    expect(osmMatches("vending", { amenity: "vending_machine" })).toBe(true)
    expect(osmMatches("toilets", { amenity: "toilets" })).toBe(true)
    expect(osmMatches("luggage", { amenity: "luggage_locker" })).toBe(true)
    expect(osmMatches("luggage", { amenity: "left_luggage" })).toBe(true)
    expect(osmMatches("police", { amenity: "police" })).toBe(true)
    expect(osmMatches("veterinary", { amenity: "veterinary" })).toBe(true)
    expect(osmMatches("taxi", { amenity: "toilets" })).toBe(false)
  })
  it("las dos consultas de Bicing buscan por red y por operador, sin distinguir mayúsculas", () => {
    expect(type("bicing").selectors).toEqual([`["amenity"="bicycle_rental"]["network"~"bicing",i]`, `["amenity"="bicycle_rental"]["operator"~"bicing",i]`])
  })
  it("teléfono y web: se guardan si tienen pinta de serlo y no se inventan", () => {
    expect(essentialContact({ phone: "+34 933 03 30 33", website: "https://www.example.cat/ca" })).toEqual({ phone: "+34 933 03 30 33", website: "https://www.example.cat/ca" })
    expect(essentialContact({ "contact:phone": "933033033;+34 600 000 000", "contact:website": "example.cat" })).toEqual({ phone: "933033033", website: "https://example.cat" })
    expect(essentialContact({ phone: "112 ext 5", website: "javascript:alert(1)" })).toEqual({ phone: null, website: null })
    expect(essentialContact({})).toEqual({ phone: null, website: null })
  })
  it("enlace a la fuente en OpenStreetMap", () => {
    expect(osmSourceUrl({ type: "node", id: 123 })).toBe("https://www.openstreetmap.org/node/123")
    expect(osmSourceUrl({ type: "way", id: "9" })).toBe("https://www.openstreetmap.org/way/9")
    expect(osmSourceUrl({ type: "area", id: 1 })).toBeNull()
    expect(osmSourceUrl({})).toBeNull()
  })
})
