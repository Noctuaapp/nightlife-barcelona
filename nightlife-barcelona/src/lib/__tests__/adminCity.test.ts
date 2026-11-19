import { describe, expect, it } from "vitest"
import {
  ADMIN_CITY_STORAGE_KEY,
  cityNameForNewRow,
  cityOfEvent,
  clubCityIndex,
  clubCountsByCity,
  clubIdsOfCity,
  eventsOfCity,
  foldName,
  isCityPrelaunch,
  parseAdminCity,
  rowsOfCity,
  rowsOfCityByClub,
} from "../adminCity"

const clubs = [
  { id: 1, name: "Razzmatazz", city: "Barcelona", latitude: 41.397, longitude: 2.191 },
  { id: 2, name: "Apolo", city: null, latitude: null, longitude: null },
  { id: 3, name: "Kapital", city: "Madrid", latitude: 40.411, longitude: -3.692 },
  { id: 4, name: "Sin ciudad en Madrid", city: null, latitude: 40.42, longitude: -3.7 },
  { id: 5, name: "Atzavara", city: "Sant Boi de Llobregat", latitude: 41.34, longitude: 2.04 },
]

describe("parseAdminCity", () => {
  it("lee una ciudad válida y cualquier otra cosa es Barcelona", () => {
    expect(parseAdminCity("madrid")).toBe("madrid")
    expect(parseAdminCity("barcelona")).toBe("barcelona")
    expect(parseAdminCity("valencia")).toBe("barcelona")
    expect(parseAdminCity(null)).toBe("barcelona")
    expect(parseAdminCity(undefined)).toBe("barcelona")
    expect(parseAdminCity("toString")).toBe("barcelona")
  })
  it("la clave de almacenamiento no cambia (si cambia, se pierde la ciudad recordada)", () => {
    expect(ADMIN_CITY_STORAGE_KEY).toBe("noctua_admin_city")
  })
})

describe("rowsOfCity", () => {
  it("separa los locales por ciudad: el texto de la ciudad y, si no basta, las coordenadas", () => {
    expect(rowsOfCity(clubs, "barcelona").map((c) => c.id)).toEqual([1, 2, 5])
    expect(rowsOfCity(clubs, "madrid").map((c) => c.id)).toEqual([3, 4])
  })
  it("las dos ciudades juntas son todo, sin repetir ni perder ninguno", () => {
    const all = [...rowsOfCity(clubs, "barcelona"), ...rowsOfCity(clubs, "madrid")]
    expect(all.map((c) => c.id).sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe("clubIdsOfCity y rowsOfCityByClub", () => {
  const sessions = [
    { id: 10, club_id: 1 },
    { id: 11, club_id: 3 },
    { id: 12, club_id: 4 },
    { id: 13, club_id: null },
    { id: 14, club_id: 999 }, // local que ya no existe
  ]
  const known = new Set(clubs.map((c) => c.id))
  it("filtra por el club de cada fila", () => {
    const madrid = rowsOfCityByClub(sessions, clubIdsOfCity(clubs, "madrid"), known, "madrid")
    expect(madrid.map((s) => s.id)).toEqual([11, 12])
  })
  it("las filas sin club (o de un club borrado) se quedan en Barcelona", () => {
    const bcn = rowsOfCityByClub(sessions, clubIdsOfCity(clubs, "barcelona"), known, "barcelona")
    expect(bcn.map((s) => s.id)).toEqual([10, 13, 14])
  })
  it("ninguna fila sale en las dos ciudades", () => {
    const a = rowsOfCityByClub(sessions, clubIdsOfCity(clubs, "barcelona"), known, "barcelona").map((s) => s.id)
    const b = rowsOfCityByClub(sessions, clubIdsOfCity(clubs, "madrid"), known, "madrid").map((s) => s.id)
    expect(a.filter((id) => b.includes(id))).toEqual([])
    expect([...a, ...b].sort()).toEqual([10, 11, 12, 13, 14])
  })
})

describe("cityNameForNewRow", () => {
  it("Barcelona no escribe nada (como siempre); Madrid escribe su nombre", () => {
    expect(cityNameForNewRow("barcelona")).toEqual({})
    expect(cityNameForNewRow("madrid")).toEqual({ city: "Madrid" })
  })
})

describe("isCityPrelaunch", () => {
  it("Madrid está sin abrir y Barcelona abierta", () => {
    expect(isCityPrelaunch("barcelona")).toBe(false)
    expect(isCityPrelaunch("madrid")).toBe(true)
  })
})

describe("foldName", () => {
  it("quita tildes, mayúsculas y espacios de más", () => {
    expect(foldName("  Sala  Apolo ")).toBe("sala apolo")
    expect(foldName("Teatro Kapital Ñ")).toBe("teatro kapital n")
    expect(foldName(null)).toBe("")
  })
})

describe("eventos", () => {
  const withChain = [...clubs, { id: 6, name: "Pacha", city: "Barcelona", latitude: null, longitude: null }, { id: 7, name: "PACHA", city: "Madrid", latitude: null, longitude: null }]
  const index = clubCityIndex(withChain)

  it("el índice de nombres deja fuera los que están en las dos ciudades", () => {
    expect(index.get("kapital")).toBe("madrid")
    expect(index.get("razzmatazz")).toBe("barcelona")
    expect(index.has("pacha")).toBe(false)
  })
  it("con coordenadas manda la posición", () => {
    expect(cityOfEvent({ club_name: "Kapital", latitude: 41.39, longitude: 2.17 }, index)).toBe("barcelona")
    expect(cityOfEvent({ club_name: "Razzmatazz", latitude: 40.41, longitude: -3.69 }, index)).toBe("madrid")
  })
  it("sin coordenadas manda el local (sin tildes ni mayúsculas)", () => {
    expect(cityOfEvent({ club_name: "KAPITAL", latitude: null, longitude: null }, index)).toBe("madrid")
    expect(cityOfEvent({ club_name: "Razzmatazz", latitude: null, longitude: null }, index)).toBe("barcelona")
  })
  it("sin coordenadas ni local conocido es de Barcelona", () => {
    expect(cityOfEvent({ club_name: "Sitio raro", latitude: null, longitude: null }, index)).toBe("barcelona")
    expect(cityOfEvent({ club_name: null }, index)).toBe("barcelona")
    expect(cityOfEvent({ club_name: "Pacha", latitude: "", longitude: "" }, index)).toBe("barcelona")
  })
  it("eventsOfCity reparte los eventos sin perder ninguno", () => {
    const events = [
      { id: 1, club_name: "Kapital", latitude: null, longitude: null },
      { id: 2, club_name: "Razzmatazz", latitude: null, longitude: null },
      { id: 3, club_name: null, latitude: 40.4, longitude: -3.7 },
      { id: 4, club_name: "Festival X", latitude: null, longitude: null },
    ]
    expect(eventsOfCity(events, "madrid", index).map((e) => e.id)).toEqual([1, 3])
    expect(eventsOfCity(events, "barcelona", index).map((e) => e.id)).toEqual([2, 4])
  })
})

describe("clubCountsByCity", () => {
  it("reparte los clubs por ciudad como la pantalla Clubs y da el total (publicados y ocultos)", () => {
    const clubs = [
      { id: 1, hidden: false, city: "Barcelona", latitude: 41.38, longitude: 2.17 },
      { id: 2, hidden: true, city: null, latitude: null, longitude: null }, // sin ciudad ni coordenadas: Barcelona
      { id: 3, hidden: false, city: "Madrid", latitude: 40.42, longitude: -3.7 },
      { id: 4, hidden: false, city: null, latitude: 40.41, longitude: -3.69 }, // dentro del rectángulo de Madrid
      { id: 5, hidden: true, city: "Madrid", latitude: 40.43, longitude: -3.71 },
    ]
    const c = clubCountsByCity(clubs)
    expect(c.barcelona).toEqual({ visible: 1, hidden: 1 })
    expect(c.madrid).toEqual({ visible: 2, hidden: 1 })
    expect(c.total).toEqual({ visible: 3, hidden: 2 })
    // Coincide con lo que cuenta la pantalla Clubs al elegir cada ciudad.
    expect(rowsOfCity(clubs, "barcelona")).toHaveLength(c.barcelona.visible + c.barcelona.hidden)
    expect(rowsOfCity(clubs, "madrid")).toHaveLength(c.madrid.visible + c.madrid.hidden)
  })
})
