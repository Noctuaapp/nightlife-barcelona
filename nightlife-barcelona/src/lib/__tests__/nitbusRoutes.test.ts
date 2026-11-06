import { describe, expect, it, vi } from "vitest"
import { alightOptions, buildNitbusData, compareLineCodes, directionStats, lineStopNames, nearestStop, normStopName, planTrips, resolveSegment, summarizeRoutes, type RouteRow, type LooseStop } from "../nitbusRoutes"
import { distanceInMeters } from "../geo"

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

describe("directionStats y summarizeRoutes", () => {
  // Paradas cada ~0,001° de latitud (≈ 111 m): 10 paradas = 9 tramos ≈ 1 km en línea recta.
  const line = (n: number) => Array.from({ length: n }, (_, i) => ({ lat: 41.38 + i * 0.001, lon: 2.17 }))

  it("cuenta las paradas y estima minutos redondeados a 5", () => {
    const st = directionStats(line(10), distanceInMeters)
    expect(st.stops).toBe(10)
    // ≈ 1 km × 1,25 / 17 km/h ≈ 4,4 min → mínimo 5
    expect(st.minutes).toBe(5)
    const long = directionStats(line(101), distanceInMeters) // ≈ 11,1 km → ≈ 49 min → 50
    expect(long.stops).toBe(101)
    expect(long.minutes).toBe(50)
  })

  it("no inventa un tiempo sin coordenadas suficientes", () => {
    const stops = line(10).map((s, i) => (i % 2 === 0 ? { lat: null, lon: null } : s))
    expect(directionStats(stops, distanceInMeters)).toEqual({ stops: 10, minutes: null })
    expect(directionStats([{ lat: 41.38, lon: 2.17 }], distanceInMeters)).toEqual({ stops: 1, minutes: null })
  })

  it("resume cada línea con su sentido más largo y respeta el orden", () => {
    const rows: RouteRow[] = [
      // desordenadas a propósito
      ...line(5).map((s, i) => r("n24", 0, 5 - i, `A${i}`, s.lat, s.lon)),
      ...line(8).map((s, i) => r("N24", 1, i + 1, `B${i}`, s.lat, s.lon)),
      ...line(3).map((s, i) => r("N1", 0, i + 1, `C${i}`, s.lat, s.lon)),
    ]
    const sum = summarizeRoutes(rows, distanceInMeters)
    expect(Object.keys(sum).sort()).toEqual(["N1", "N24"])
    expect(sum.N24.stops).toBe(8)
    expect(sum.N1.stops).toBe(3)
  })
})

describe("planTrips", () => {
  // Sentido 0 va de sur a norte (A1…A10); el sentido 1 vuelve de norte a sur (B1…B10), una calle al lado.
  const rows: RouteRow[] = []
  for (let i = 0; i < 10; i++) rows.push(r("N24", 0, i + 1, `A${i + 1}`, 41.38 + i * 0.002, 2.17))
  for (let i = 0; i < 10; i++) rows.push(r("N24", 1, i + 1, `B${i + 1}`, 41.38 + (9 - i) * 0.002, 2.1703))
  const line = buildNitbusData(rows, []).lines.N24
  const me = { lat: 41.3805, lon: 2.17 } // junto a A1 (y B10)
  const spot = { lat: 41.3961, lon: 2.17 } // junto a A9 (y B2)

  it("da la ida en el sentido que va de mi parada al sitio y la vuelta en el contrario", () => {
    const trips = planTrips(line, me, spot, distanceInMeters)
    expect(trips).toHaveLength(2)
    const [go, back] = trips
    expect(go).toMatchObject({ dir: 0, kind: "go", from: 0, to: 8, stops: 8 })
    expect(back).toMatchObject({ dir: 1, kind: "back", from: 1, to: 9, stops: 8 })
    expect(go.minutes === null || go.minutes >= 5).toBe(true)
  })

  it("no inventa trayecto si la línea no tiene el recorrido en orden o es la misma parada", () => {
    const loose = buildNitbusData([], [{ name: "X", subcategory: "N24", latitude: 41.38, longitude: 2.17 }, { name: "Y", subcategory: "N24", latitude: 41.39, longitude: 2.17 }]).lines.N24
    expect(planTrips(loose, me, spot, distanceInMeters)).toEqual([])
    expect(planTrips(line, me, me, distanceInMeters)).toEqual([])
  })

  it("no repite la misma tarjeta si los dos sentidos guardados son el mismo recorrido", () => {
    const dup: RouteRow[] = []
    for (const d of [0, 1]) for (let i = 0; i < 10; i++) dup.push(r("N9", d, i + 1, `A${i + 1}`, 41.38 + i * 0.002, 2.17))
    const l = buildNitbusData(dup, []).lines.N9
    expect(planTrips(l, me, spot, distanceInMeters)).toHaveLength(1)
  })
})

describe("Mi trayecto: lineStopNames, alightOptions y resolveSegment", () => {
  // Ida A→B→C→D y vuelta D→C→B→A, con las paradas separadas ~0,9 km para que haya tiempo estimado.
  const rows: RouteRow[] = [
    r("N4", 0, 1, "Pl. Catalunya", 41.38, 2.1),
    r("N4", 0, 2, "Av. Paral·lel", 41.38, 2.11),
    r("N4", 0, 3, "Sants Estació", 41.38, 2.12),
    r("N4", 0, 4, "El Carmel", 41.38, 2.13),
    r("N4", 1, 1, "El Carmel", 41.38, 2.13),
    r("N4", 1, 2, "Sants Estació", 41.38, 2.12),
    r("N4", 1, 3, "Av. Paral·lel", 41.38, 2.11),
    r("N4", 1, 4, "Pl. Catalunya", 41.38, 2.1),
  ]
  const line = buildNitbusData(rows, []).lines.N4

  it("lista cada parada una sola vez, en el orden del primer sentido", () => {
    expect(lineStopNames(line)).toEqual(["Pl. Catalunya", "Av. Paral·lel", "Sants Estació", "El Carmel"])
  })

  it("solo ofrece bajar en las paradas que vienen después de la de subida", () => {
    expect(alightOptions(line, "Av. Paral·lel")).toEqual(["Sants Estació", "El Carmel", "Pl. Catalunya"])
    // En la última parada del sentido de ida solo se puede ir hacia el otro lado.
    expect(alightOptions(line, "El Carmel")).toEqual(["Sants Estació", "Av. Paral·lel", "Pl. Catalunya"])
    expect(alightOptions(line, "No existe")).toEqual([])
  })

  it("deduce el sentido de en cuál de los dos va la subida antes que la bajada", () => {
    const ida = resolveSegment(line, "Pl. Catalunya", "Sants Estació", distanceInMeters)
    expect(ida).toMatchObject({ dir: 0, from: 0, to: 2, stops: 2 })
    expect(ida!.minutes).toBeGreaterThanOrEqual(5)
    const vuelta = resolveSegment(line, "Sants Estació", "Pl. Catalunya", distanceInMeters)
    expect(vuelta).toMatchObject({ dir: 1, from: 1, to: 3, stops: 2 })
  })

  it("no distingue acentos, mayúsculas ni signos", () => {
    expect(resolveSegment(line, "PL CATALUNYA", "sants estacio", distanceInMeters)).toMatchObject({ dir: 0, from: 0, to: 2 })
  })

  it("devuelve null si no hay trayecto o las paradas son la misma", () => {
    expect(resolveSegment(line, "Sants Estació", "Sants Estació", distanceInMeters)).toBeNull()
    expect(resolveSegment(line, "Pl. Catalunya", "No existe", distanceInMeters)).toBeNull()
    expect(resolveSegment(line, "", "El Carmel", distanceInMeters)).toBeNull()
  })

  it("en una línea circular elige el tramo más corto", () => {
    const circular = buildNitbusData(
      [r("N9", 0, 1, "A"), r("N9", 0, 2, "B"), r("N9", 0, 3, "C"), r("N9", 0, 4, "A")],
      []
    ).lines.N9
    expect(resolveSegment(circular, "B", "A", distanceInMeters)).toMatchObject({ dir: 0, from: 1, to: 3, stops: 2 })
    expect(resolveSegment(circular, "A", "C", distanceInMeters)).toMatchObject({ dir: 0, from: 0, to: 2, stops: 2 })
  })

  it("sin el recorrido en orden (lista alfabética) no hay tramo", () => {
    const loose: LooseStop[] = [
      { name: "Pl. Catalunya", subcategory: "N7", latitude: 41.38, longitude: 2.1 },
      { name: "Sants Estació", subcategory: "N7", latitude: 41.38, longitude: 2.12 },
    ]
    const unordered = buildNitbusData([], loose).lines.N7
    expect(unordered.ordered).toBe(false)
    expect(alightOptions(unordered, "Pl. Catalunya")).toEqual([])
    expect(resolveSegment(unordered, "Pl. Catalunya", "Sants Estació", distanceInMeters)).toBeNull()
  })
})
