import { describe, expect, it } from "vitest"
import {
  CITIES,
  EXCLUDE_PRELAUNCH_OR,
  PRELAUNCH_CITY_NAMES,
  cityOfClub,
  googleSearchFor,
  inAnyCityBox,
} from "../cities"
import { isInServiceArea } from "../coords"

describe("cityOfClub", () => {
  it("Barcelona es la ciudad por defecto (sin ciudad, sin coordenadas o con otra ciudad catalana)", () => {
    expect(cityOfClub({})).toBe("barcelona")
    expect(cityOfClub({ city: null, latitude: null, longitude: null })).toBe("barcelona")
    expect(cityOfClub({ city: "Barcelona", latitude: 41.39, longitude: 2.17 })).toBe("barcelona")
    expect(cityOfClub({ city: "L'Hospitalet de Llobregat" })).toBe("barcelona")
    expect(cityOfClub({ city: "Badalona", latitude: "41.45", longitude: "2.24" })).toBe("barcelona")
  })

  it("Madrid por el texto de la ciudad, con o sin mayúsculas ni espacios", () => {
    expect(cityOfClub({ city: "Madrid" })).toBe("madrid")
    expect(cityOfClub({ city: "  madrid " })).toBe("madrid")
    expect(cityOfClub({ city: "MADRID" })).toBe("madrid")
  })

  it("Madrid por las coordenadas cuando no hay ciudad (también si llegan como texto)", () => {
    expect(cityOfClub({ latitude: 40.4168, longitude: -3.7038 })).toBe("madrid")
    expect(cityOfClub({ city: null, latitude: "40.42", longitude: "-3.70" })).toBe("madrid")
  })

  it("no confunde otras ciudades con Madrid", () => {
    expect(cityOfClub({ city: "Madridejos" })).toBe("barcelona")
    expect(cityOfClub({ latitude: 39.4699, longitude: -0.3763 })).toBe("barcelona") // Valencia
    // coordenadas a medias o vacías: no cuentan como Madrid
    expect(cityOfClub({ latitude: 40.42, longitude: null })).toBe("barcelona")
    expect(cityOfClub({ latitude: "", longitude: "" })).toBe("barcelona")
  })
})

describe("googleSearchFor", () => {
  it("para Barcelona sale exactamente la búsqueda de siempre y sin sesgo", () => {
    const s = googleSearchFor({ name: "Razzmatazz", address: "Carrer dels Almogàvers, 122", city: "Barcelona" })
    expect(s.query).toBe("Razzmatazz Carrer dels Almogàvers, 122 Barcelona")
    expect(s.locationBias).toBeUndefined()
    expect(googleSearchFor({ name: "Kahala", neighborhood: "Les Corts" }).query).toBe("Kahala Les Corts Barcelona")
    // sin dirección ni barrio queda un espacio doble, igual que con la plantilla de antes (a Google le da igual)
    expect(googleSearchFor({ name: "Kahala" }).query).toBe("Kahala  Barcelona")
  })

  it("para Madrid acaba en Madrid y lleva sesgo hacia Madrid", () => {
    const s = googleSearchFor({ name: "Teatro Kapital", address: "Calle de Atocha, 125", city: "Madrid" })
    expect(s.city).toBe("madrid")
    expect(s.query).toBe("Teatro Kapital Calle de Atocha, 125 Madrid")
    expect(s.locationBias).toEqual({
      circle: { center: { latitude: 40.4168, longitude: -3.7038 }, radius: 25000 },
    })
  })
})

describe("zonas", () => {
  it("la zona de servicio incluye Cataluña (como antes) y Madrid, pero no Valencia ni el mar", () => {
    expect(isInServiceArea({ lat: 41.3874, lng: 2.1686 })).toBe(true) // Barcelona
    expect(isInServiceArea({ lat: 41.2279, lng: 1.8068 })).toBe(true) // Vilanova (Costa Dorada)
    expect(isInServiceArea({ lat: 40.4168, lng: -3.7038 })).toBe(true) // Madrid
    expect(isInServiceArea({ lat: 39.4699, lng: -0.3763 })).toBe(false) // Valencia
    expect(isInServiceArea({ lat: 41.39, lng: -2.17 })).toBe(false) // signo menos de más
  })

  it("el rectángulo de Barcelona es el mismo que usaba la herramienta de coordenadas", () => {
    expect(inAnyCityBox(41.3874, 2.1686)).toBe(true)
    expect(inAnyCityBox(41.28, 2.17)).toBe(false) // justo en el borde: fuera, como antes (> y <)
    expect(inAnyCityBox(41.56, 2.17)).toBe(false)
    expect(inAnyCityBox(41.4, 1.94)).toBe(false)
    expect(inAnyCityBox(41.4, 2.36)).toBe(false)
    expect(inAnyCityBox(40.4168, -3.7038)).toBe(true) // Madrid
    expect(inAnyCityBox(39.47, -0.38)).toBe(false)
  })
})

describe("prelaunch", () => {
  it("Madrid está en prelaunch y Barcelona no", () => {
    expect(CITIES.madrid.prelaunch).toBe(true)
    expect(CITIES.barcelona.prelaunch).toBe(false)
    expect(PRELAUNCH_CITY_NAMES).toEqual(["Madrid"])
  })

  it("el filtro de la tarea nocturna conserva los locales sin ciudad y deja fuera Madrid", () => {
    expect(EXCLUDE_PRELAUNCH_OR).toBe("city.is.null,city.not.ilike.Madrid")
  })
})
