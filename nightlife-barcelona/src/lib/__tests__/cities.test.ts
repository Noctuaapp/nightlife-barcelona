import { describe, expect, it } from "vitest"
import {
  CITIES,
  EXCLUDE_PRELAUNCH_OR,
  PRELAUNCH_CITY_NAMES,
  cityFromPath,
  cityOfClub,
  cityPath,
  cityUrl,
  googleSearchFor,
  inAnyCityBox,
  isCityOpen,
  isCityScoped,
  stripCityPath,
  switchCityPath,
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

describe("foto de portada", () => {
  it("cada ciudad tiene su foto en public/hero y no comparten", async () => {
    const fs = await import("node:fs")
    const files = Object.values(CITIES).map((c) => c.heroImage)
    for (const f of files) {
      expect(f.startsWith("/hero/"), f).toBe(true)
      expect(fs.existsSync(`public${f}`), `falta public${f}`).toBe(true)
    }
    expect(new Set(files).size).toBe(files.length)
  })
})

describe("URLs por ciudad (Fase E)", () => {
  it("Madrid es todo lo que cuelga de /madrid; el resto, Barcelona", () => {
    expect(cityFromPath("/madrid")).toBe("madrid")
    expect(cityFromPath("/madrid/clubs")).toBe("madrid")
    expect(cityFromPath("/madrid/barrio/malasana")).toBe("madrid")
    expect(cityFromPath("/")).toBe("barcelona")
    expect(cityFromPath("/clubs")).toBe("barcelona")
    expect(cityFromPath("/madridista")).toBe("barcelona")
    expect(cityFromPath("/clubs/madrid-club")).toBe("barcelona")
    expect(cityFromPath(null)).toBe("barcelona")
    expect(cityFromPath(undefined)).toBe("barcelona")
  })

  it("en Barcelona ninguna dirección cambia", () => {
    for (const p of ["/", "/clubs", "/clubs?open=1", "/essentials/taxi", "/map", "/barrio/gracia", "/profile", "https://x.com/clubs", "#top"]) {
      expect(cityPath(p, "barcelona")).toBe(p)
    }
  })

  it("en Madrid se prefijan las páginas con versión propia y se conserva la consulta y el ancla", () => {
    expect(cityPath("/", "madrid")).toBe("/madrid")
    expect(cityPath("/clubs", "madrid")).toBe("/madrid/clubs")
    expect(cityPath("/clubs?open=1", "madrid")).toBe("/madrid/clubs?open=1")
    expect(cityPath("/essentials", "madrid")).toBe("/madrid/essentials")
    expect(cityPath("/essentials/pharmacy", "madrid")).toBe("/madrid/essentials/pharmacy")
    expect(cityPath("/map?type=clubs", "madrid")).toBe("/madrid/map?type=clubs")
    expect(cityPath("/plan", "madrid")).toBe("/madrid/plan")
    expect(cityPath("/barrio/malasana", "madrid")).toBe("/madrid/barrio/malasana")
    expect(cityPath("/musica/techno", "madrid")).toBe("/madrid/musica/techno")
    expect(cityPath("/#como-volver", "madrid")).toBe("/madrid#como-volver")
  })

  it("en Madrid no se tocan las páginas comunes, las externas ni las que ya llevan prefijo", () => {
    for (const p of ["/clubs/joy-eslava", "/profile", "/favorites", "/login", "/privacy", "/events", "/event/algo", "/club-event/3", "/admin/dashboard", "/en/clubs", "https://www.google.com/maps", "//cdn.x.com/a", "#top", "mailto:a@b.c", "/madrid/clubs", "/madrid"]) {
      expect(cityPath(p, "madrid")).toBe(p)
    }
  })

  it("quitar el prefijo es la operación inversa", () => {
    expect(stripCityPath("/madrid")).toBe("/")
    expect(stripCityPath("/madrid/clubs")).toBe("/clubs")
    expect(stripCityPath("/madrid/clubs?open=1")).toBe("/clubs?open=1")
    expect(stripCityPath("/clubs")).toBe("/clubs")
    expect(stripCityPath("/madridista")).toBe("/madridista")
    for (const p of ["/", "/clubs", "/essentials/taxi", "/map?id=3"]) expect(stripCityPath(cityPath(p, "madrid"))).toBe(p)
  })

  it("qué rutas tienen versión por ciudad", () => {
    for (const p of ["/", "/clubs", "/essentials", "/essentials/taxi", "/map", "/plan", "/barrio/x", "/musica/techno"]) expect(isCityScoped(p), p).toBe(true)
    for (const p of ["/clubs/abc", "/profile", "/zona/badalona", "/metro", "/nitbus", "/events", "/essentials/sugerir"]) expect(isCityScoped(p), p).toBe(false)
  })

  it("dirección completa para metadatos", () => {
    expect(cityUrl("/", "barcelona")).toBe("https://www.noctuaapp.com")
    expect(cityUrl("/clubs", "barcelona")).toBe("https://www.noctuaapp.com/clubs")
    expect(cityUrl("/", "madrid")).toBe("https://www.noctuaapp.com/madrid")
    expect(cityUrl("/clubs", "madrid")).toBe("https://www.noctuaapp.com/madrid/clubs")
    expect(cityUrl("/clubs/joy-eslava", "madrid")).toBe("https://www.noctuaapp.com/clubs/joy-eslava")
  })

  it("el selector de ciudad lleva a la misma página si existe en la otra ciudad y, si no, a su portada", () => {
    expect(switchCityPath("/clubs", "madrid")).toBe("/madrid/clubs")
    expect(switchCityPath("/madrid/clubs", "barcelona")).toBe("/clubs")
    expect(switchCityPath("/essentials", "madrid")).toBe("/madrid/essentials")
    expect(switchCityPath("/madrid/map?id=4", "barcelona")).toBe("/map")
    expect(switchCityPath("/", "madrid")).toBe("/madrid")
    expect(switchCityPath("/madrid", "barcelona")).toBe("/")
    // sin equivalente: a la portada de la ciudad
    expect(switchCityPath("/barrio/gracia", "madrid")).toBe("/madrid")
    expect(switchCityPath("/madrid/barrio/malasana", "barcelona")).toBe("/")
    expect(switchCityPath("/clubs/joy-eslava", "barcelona")).toBe("/")
    expect(switchCityPath("/clubs/joy-eslava", "madrid")).toBe("/madrid")
    expect(switchCityPath("/profile", "madrid")).toBe("/madrid")
  })

  it("una ciudad está abierta cuando no está en prelaunch", () => {
    expect(isCityOpen("barcelona")).toBe(true)
    const original = CITIES.madrid.prelaunch
    try {
      CITIES.madrid.prelaunch = true
      expect(isCityOpen("madrid")).toBe(false)
      CITIES.madrid.prelaunch = false
      expect(isCityOpen("madrid")).toBe(true)
    } finally {
      CITIES.madrid.prelaunch = original
    }
  })
})
