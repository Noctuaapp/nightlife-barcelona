import { describe, expect, it } from "vitest"
import { buildRouteRows, cleanStopName, type OsmNodeLike, type OsmRelationLike } from "../nitbusOsmRoutes"

const node = (name: string, lat: number, lon: number, extra: Record<string, string> = {}): OsmNodeLike => ({
  lat,
  lon,
  tags: { name, ...extra },
})

const nodes = new Map<number, OsmNodeLike>([
  [1, node("Estació Marítima", 41.35, 2.18)],
  [2, node("Av. Paral·lel", 41.37, 2.16)],
  [3, node("Pl. Catalunya", 41.387, 2.17, { ref: "1234" })],
  [4, node("El Carmel", 41.42, 2.15)],
  [5, node("Pl. Catalunya", 41.3871, 2.1701)], // poste de la misma parada, otro nodo
  [6, { lat: 41.4, lon: 2.1, tags: {} }], // sin nombre
  [7, { tags: { name: "Sin coordenadas" } }],
  [8, node("Variante rara", 41.3, 2.1)],
])

const rel = (ref: string, ids: number[], role = "platform"): OsmRelationLike => ({
  tags: { ref },
  members: ids.map((id) => ({ type: "node", ref: id, role })),
})

describe("cleanStopName", () => {
  it("quita espacios y el prefijo «Parada»", () => {
    expect(cleanStopName("  Parada:  Pl.   Catalunya ")).toBe("Pl. Catalunya")
  })
})

describe("buildRouteRows", () => {
  it("numera las paradas en el orden de la relación y guarda los dos sentidos", () => {
    const rows = buildRouteRows([rel("N4", [1, 2, 3, 4]), rel("N4", [4, 3, 2, 1])], nodes)
    const d0 = rows.filter((r) => r.direction === 0)
    const d1 = rows.filter((r) => r.direction === 1)
    expect(d0.map((r) => r.name)).toEqual(["Estació Marítima", "Av. Paral·lel", "Pl. Catalunya", "El Carmel"])
    expect(d0.map((r) => r.seq)).toEqual([1, 2, 3, 4])
    expect(d1.map((r) => r.name)).toEqual(["El Carmel", "Pl. Catalunya", "Av. Paral·lel", "Estació Marítima"])
  })

  it("descarta paradas sin nombre o sin coordenadas y junta las repetidas seguidas", () => {
    const rows = buildRouteRows([rel("N1", [1, 6, 7, 3, 5, 4])], nodes)
    expect(rows.map((r) => r.name)).toEqual(["Estació Marítima", "Pl. Catalunya", "El Carmel"])
    expect(rows[1].code).toBe("1234")
  })

  it("no cuela variantes del mismo sentido como segundo sentido", () => {
    const rows = buildRouteRows([rel("N6", [1, 2, 3, 4]), rel("N6", [1, 8, 3, 4])], nodes)
    expect(rows.every((r) => r.direction === 0)).toBe(true)
    expect(rows).toHaveLength(4)
  })

  it("el segundo sentido es el contrario, no una variante más larga del mismo que acaba en el mismo sitio", () => {
    // Caso N9: ida 1→2→3→4, una variante 8→2→3→4 que ACABA igual, y la vuelta 4→3→2→1 (más corta).
    const rows = buildRouteRows([rel("N9", [1, 2, 3, 4]), rel("N9", [8, 1, 2, 3, 4]), rel("N9", [4, 3, 1])], nodes)
    const d1 = rows.filter((r) => r.direction === 1)
    expect(d1.map((r) => r.name)).toEqual(["El Carmel", "Pl. Catalunya", "Estació Marítima"])
    expect(rows.filter((r) => r.direction === 0)[0].name).toBe("Variante rara")
  })

  it("si solo hay variantes del mismo sentido, deja un único sentido", () => {
    const rows = buildRouteRows([rel("N9", [1, 2, 3, 4]), rel("N9", [8, 1, 2, 3, 4])], nodes)
    expect(rows.every((r) => r.direction === 0)).toBe(true)
  })

  it("usa los «stop» si la relación no tiene «platform»", () => {
    const rows = buildRouteRows([rel("N9", [1, 2, 4], "stop")], nodes)
    expect(rows.map((r) => r.name)).toEqual(["Estació Marítima", "Av. Paral·lel", "El Carmel"])
  })

  it("ignora relaciones que no son líneas N y recorridos de menos de 2 paradas", () => {
    expect(buildRouteRows([rel("H12", [1, 2]), rel("N3", [1])], nodes)).toEqual([])
  })

  it("ordena por número de línea, no alfabéticamente", () => {
    const rows = buildRouteRows([rel("N24", [1, 2]), rel("N4", [1, 2]), rel("N10", [1, 2])], nodes)
    expect([...new Set(rows.map((r) => r.line))]).toEqual(["N4", "N10", "N24"])
  })
})
