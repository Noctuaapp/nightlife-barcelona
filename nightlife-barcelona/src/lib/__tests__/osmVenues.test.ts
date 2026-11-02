import { describe, it, expect } from "vitest"
import { NIGHT_NAME, isNightlifeVenue, venueTypeOf, venueFlagsOf } from "../osmVenues"

const pub = (name: string, extra: Record<string, string> = {}) => ({ amenity: "pub", name, ...extra })
const bar = (name: string, extra: Record<string, string> = {}) => ({ amenity: "bar", name, ...extra })

describe("nombres que delatan ocio nocturno", () => {
  it("reconoce los nombres de noche, también con tildes y en catalán", () => {
    for (const n of ["Sala Apolo", "Karaoke Sunset", "Moog Discoteca", "La Nit", "Cóctel Room", "Còctels del Born", "Rock Bar", "Live Music House", "Irish Pub Dublín", "Bar Latino", "Jazz Club", "Beach Chiringuito", "Billar Poble Sec"]) {
      expect(NIGHT_NAME.test(n), n).toBe(true)
    }
  })

  it("no se deja engañar por palabras que solo contienen la sílaba", () => {
    for (const n of ["Bar Oliver", "Bar Benito", "Platinum Café", "Bar Rocky", "Liverpool Café", "Bar Salamanca", "Cafetería Anita", "Bar Unitat"]) {
      expect(NIGHT_NAME.test(n), n).toBe(false)
    }
  })
})

describe("isNightlifeVenue", () => {
  it("admite discotecas, salas y karaokes aunque el nombre sea corriente", () => {
    expect(isNightlifeVenue({ amenity: "nightclub", name: "Marlene" })).toBe(true)
    expect(isNightlifeVenue({ amenity: "music_venue", name: "Bikini" })).toBe(true)
    expect(isNightlifeVenue({ amenity: "karaoke_box", name: "Voces" })).toBe(true)
  })

  it("admite un bar solo si hay señal de noche", () => {
    expect(isNightlifeVenue(bar("Bar Manolo"))).toBe(false)
    expect(isNightlifeVenue(bar("Bar Manolo", { live_music: "yes" }))).toBe(true)
    expect(isNightlifeVenue(bar("Bar Manolo", { karaoke: "yes" }))).toBe(true)
    expect(isNightlifeVenue(bar("Bar Manolo", { "music:live": "yes" }))).toBe(true)
    expect(isNightlifeVenue(bar("Karaoke Manolo"))).toBe(true)
  })

  it("descarta restaurantes y centros aunque el nombre diga «club»", () => {
    expect(isNightlifeVenue(bar("Club de Fútbol Badalona"))).toBe(false)
    expect(isNightlifeVenue(bar("Restaurante Night"))).toBe(false)
  })

  it("descarta las salas VIP y los locales de los aeropuertos, aunque lleven «sala» o «lounge»", () => {
    for (const n of ["Sala VIP Canudas", "Sala VIP Pau Casals", "Salón VIP Joan Miró", "Iberia VIP Lounge", "Business Lounge T1", "Lounge Aeropuerto El Prat", "Airport Club Bar", "Sala Terminal 2", "Terminal 1 Music Bar"]) {
      expect(isNightlifeVenue(bar(n)), n).toBe(false)
      expect(isNightlifeVenue(pub(n)), n).toBe(false)
    }
    // un bar normal con «sala» o «lounge» sigue entrando
    expect(isNightlifeVenue(bar("Sala Apolo Lounge"))).toBe(true)
    expect(isNightlifeVenue(bar("Terminus Club"))).toBe(true)
  })
})

describe("venueTypeOf", () => {
  it("usa los tipos que existen en Noctua", () => {
    expect(venueTypeOf({ amenity: "nightclub", name: "Razzmatazz" })).toBe("Discoteca")
    expect(venueTypeOf({ amenity: "music_venue", name: "Bikini" })).toBe("Bar musical")
    expect(venueTypeOf(pub("The Irish Rover"))).toBe("Pub")
    expect(venueTypeOf(bar("Bar con música"))).toBe("Bar musical")
  })

  it("separa karaokes, cocteleras y bares de billar, que son lo que buscan los filtros", () => {
    expect(venueTypeOf(bar("Karaoke Sunset"))).toBe("Karaoke")
    expect(venueTypeOf({ amenity: "karaoke_box", name: "Voces" })).toBe("Karaoke")
    expect(venueTypeOf(bar("Cocktail Lab"))).toBe("Coctelería")
    expect(venueTypeOf(pub("Coctelería Nocturna"))).toBe("Coctelería")
    expect(venueTypeOf(bar("Còctels del Born"))).toBe("Coctelería")
    expect(venueTypeOf(bar("Billar Sants"))).toBe("Bar de billar")
    expect(venueTypeOf(bar("Pool Bar"))).toBe("Bar de billar")
  })

  it("una discoteca con «cocktail» en el nombre sigue siendo discoteca", () => {
    expect(venueTypeOf({ amenity: "nightclub", name: "Cocktail Club" })).toBe("Discoteca")
  })
})

describe("venueFlagsOf", () => {
  it("devuelve siempre las cinco etiquetas, en true o false", () => {
    const f = venueFlagsOf(bar("Bar"), "Bar musical")
    expect(Object.keys(f).sort()).toEqual(["cocktails", "dance_floor", "karaoke", "live_music", "wheelchair_accessible"])
    expect(Object.values(f).every((v) => v === false)).toBe(true)
  })

  it("solo activa lo que OpenStreetMap dice expresamente", () => {
    const f = venueFlagsOf(bar("Bar", { karaoke: "yes", live_music: "yes", dance: "yes", wheelchair: "yes" }), "Bar musical")
    expect(f).toEqual({ karaoke: true, live_music: true, dance_floor: true, wheelchair_accessible: true, cocktails: false })
    expect(venueFlagsOf({ amenity: "nightclub", name: "X" }, "Discoteca").dance_floor).toBe(false)
  })

  it("el tipo manda sobre las etiquetas de karaoke y cócteles", () => {
    expect(venueFlagsOf(bar("Karaoke X"), "Karaoke").karaoke).toBe(true)
    expect(venueFlagsOf(bar("Cocktail X"), "Coctelería").cocktails).toBe(true)
  })
})
