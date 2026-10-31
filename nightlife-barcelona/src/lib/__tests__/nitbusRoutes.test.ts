import { describe, expect, it, vi } from "vitest"
import { buildNitbusData, compareLineCodes, nearestStop, normStopName, type RouteRow, type LooseStop } from "../nitbusRoutes"

// El módulo importa el cliente de Supabase (necesita variables de entorno); aquí solo se prueba lo puro.
vi.mock("../supabase", () => ({ supabase: {} }))

const r = (line: string, direction: number, seq: number, name: string, lat = 41.38, lon = 2.17): RouteRow => ({
  line,
  direction,
  seq,
  name,
  latitude: lat,
  longitude: lon,
})

describe("normStopName", () => {
  it("ignora acentos, mayúsculas y signos", () => {
    expect(normStopName("Pl. Catalunya")).toBe(normStopName("PL CATALUNYA"))
    expect(normStopName("Rda. Universitat")).toBe("rdauniversitat")
    expect(normStopName("Gràcia – Pg.")).toBe("graciapg")
  })
})

describe("compareLineCodes", () => {
  it("ordena N2 antes que N10", () => {
    expect(["N10", "N2", "N24", "N4"].sort(compareLineCodes)).toEqual(["N2", "N4", "N10", "N24"])
  })
})

describe("buildNitbusData con recorrido", () => {
  const rows: RouteRow[] = [
    r("N4", 0, 3, "Pl. Catalunya"),
    r("N4", 0, 1, "Estació Marítima"),
    r("N4", 0, 2, "Av. Paral·lel"),
    r("N4", 0, 4, "El Carmel"),
    r("N4", 1, 1, "El Carmel"),
    r("N4", 1, 2, "Pl. Catalunya"),
    r("N4", 1, 3, "Estació Marítima"),
    r("N24", 0, 1, "Barceloneta"),
    r("N24", 0, 2, "PL CATALUNYA"),
    r("N24", 0, 3, "Roquetes"),
  ]
  const data = buildNitbusData(rows, [])

  it("ordena las paradas por seq y marca el origen y el destino", () => {
    const d = data.lines.N4.directions[0]
    expect(d.stops.map((s) => s.name)).toEqual(["Estació Marítima", "Av. Paral·lel", "Pl. Catalunya", "El Carmel"])
    expect(d.from).toBe("Estació Marítima")
    expect(d.to).toBe("El Carmel")
    expect(data.lines.N4.ordered).toBe(true)
  })

  it("separa los dos sentidos y cuenta cada parada una sola vez", () => {
    expect(data.lines.N4.directions).toHaveLength(2)
    expect(data.lines.N4.stopCount).toBe(4)
    expect(data.lines.N24.directions).toHaveLength(1)
  })

  it("calcula los transbordos por nombre, sin importar mayúsculas", () => {
    const cat = data.lines.N4.directions[0].stops.find((s) => s.name === "Pl. Catalunya")!
    expect(cat.others).toEqual(["N24"])
    const paral = data.lines.N4.directions[0].stops.find((s) => s.name === "Av. Paral·lel")!
    expect(paral.others).toEqual([])
  })

  it("el buscador junta las líneas de cada nombre", () => {
    const e = data.search.find((x) => normStopName(x.name) === "plcatalunya")!
    expect(e.lines).toEqual(["N4", "N24"])
  })
})

describe("buildNitbusData sin recorrido (paradas sueltas)", () => {
  const loose: LooseStop[] = [
    { name: "Urquinaona", subcategory: "N4, N24", latitude: 41.389, longitude: 2.173 },
    { name: "Sants Estació", subcategory: "N1", latitude: 41.379, longitude: 2.14 },
    { name: "Aragó", subcategory: "N4", latitude: 41.39, longitude: 2.16 },
    { name: "urquinaona", subcategory: "N4", latitude: 41.389, longitude: 2.1731 },
  ]
  const data = buildNitbusData([], loose)

  it("las enseña por orden alfabético y sin repetir, marcadas como no ordenadas", () => {
    expect(data.lines.N4.ordered).toBe(false)
    expect(data.lines.N4.directions).toHaveLength(1)
    expect(data.lines.N4.directions[0].stops.map((s) => s.name)).toEqual(["Aragó", "Urquinaona"])
    expect(data.lines.N4.stopCount).toBe(2)
  })

  it("sigue calculando los transbordos", () => {
    expect(data.lines.N24.directions[0].stops[0].others).toEqual(["N4"])
  })

  it("ignora subcategorías que no son líneas N", () => {
    const d = buildNitbusData([], [{ name: "X", subcategory: "L1, bus", latitude: null, longitude: null }])
    expect(Object.keys(d.lines)).toEqual([])
  })
})

describe("recorrido + paradas sueltas", () => {
  it("una línea sin recorrido guardado usa las sueltas aunque otras sí lo tengan", () => {
    const d = buildNitbusData(
      [r("N4", 0, 1, "A"), r("N4", 0, 2, "B")],
      [{ name: "Zeta", subcategory: "N7", latitude: null, longitude: null }]
    )
    expect(d.lines.N4.ordered).toBe(true)
    expect(d.lines.N7.ordered).toBe(false)
  })
})

describe("nearestStop", () => {
  const dist = (a: number, b: number, c: number, d: number) => Math.hypot(a - c, b - d) * 111000
  it("devuelve la más cercana e ignora las que no tienen coordenadas", () => {
    const stops = [
      { lat: null, lon: null, name: "sin coords" },
      { lat: 41.4, lon: 2.2, name: "lejos" },
      { lat: 41.381, lon: 2.171, name: "cerca" },
    ]
    const res = nearestStop(stops, 41.38, 2.17, dist)!
    expect(res.stop.name).toBe("cerca")
    expect(res.index).toBe(2)
  })
  it("sin ninguna con coordenadas, null", () => {
    expect(nearestStop([{ lat: null, lon: null }], 41, 2, dist)).toBeNull()
  })
})
