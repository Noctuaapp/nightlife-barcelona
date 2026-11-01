import { describe, it, expect } from "vitest"
import { boundaryAreaKm2, boundaryBbox, boundaryFromRelations, fromCompact, insideBoundary, simplifyRing, toCompact } from "../osmBoundary"

const g = (lat: number, lon: number) => ({ lat, lon })
const way = (role: string, ...pts: [number, number][]) => ({ type: "way", role, geometry: pts.map(([a, b]) => g(a, b)) })
const rel = (...members: any[]) => [{ type: "relation", id: 1, members }]

// Cuadrado 41.40–41.50 / 2.20–2.30 partido en cuatro lados (como lo parte OpenStreetMap).
const SIDES = {
  south: way("outer", [41.4, 2.2], [41.4, 2.3]),
  east: way("outer", [41.4, 2.3], [41.5, 2.3]),
  north: way("outer", [41.5, 2.3], [41.5, 2.2]),
  west: way("outer", [41.5, 2.2], [41.4, 2.2]),
}

describe("boundaryFromRelations", () => {
  it("une los tramos en un anillo cerrado y distingue dentro de fuera", () => {
    const b = boundaryFromRelations(rel(SIDES.south, SIDES.east, SIDES.north, SIDES.west))
    expect(b.outer).toHaveLength(1)
    expect(insideBoundary(b, 41.45, 2.25)).toBe(true)
    expect(insideBoundary(b, 41.55, 2.25)).toBe(false)
    expect(insideBoundary(b, 41.45, 2.35)).toBe(false)
    expect(insideBoundary(b, 41.39, 2.25)).toBe(false)
  })

  it("no importa el orden ni el sentido en que vengan los tramos", () => {
    const rev = (w: any) => ({ ...w, geometry: [...w.geometry].reverse() })
    const b = boundaryFromRelations(rel(rev(SIDES.north), SIDES.west, rev(SIDES.south), SIDES.east))
    expect(b.outer).toHaveLength(1)
    expect(insideBoundary(b, 41.45, 2.25)).toBe(true)
    expect(insideBoundary(b, 41.6, 2.25)).toBe(false)
  })

  it("un anillo ya cerrado en un solo tramo funciona", () => {
    const b = boundaryFromRelations(rel(way("outer", [41.4, 2.2], [41.4, 2.3], [41.5, 2.3], [41.5, 2.2], [41.4, 2.2])))
    expect(insideBoundary(b, 41.45, 2.25)).toBe(true)
  })

  it("un tramo sin rol se trata como exterior", () => {
    const b = boundaryFromRelations(rel(...Object.values(SIDES).map((w) => ({ ...w, role: "" }))))
    expect(insideBoundary(b, 41.45, 2.25)).toBe(true)
  })

  it("los huecos (inner) quedan fuera", () => {
    const hole = way("inner", [41.44, 2.24], [41.44, 2.26], [41.46, 2.26], [41.46, 2.24], [41.44, 2.24])
    const b = boundaryFromRelations(rel(...Object.values(SIDES), hole))
    expect(insideBoundary(b, 41.45, 2.25)).toBe(false) // dentro del hueco
    expect(insideBoundary(b, 41.42, 2.22)).toBe(true)
  })

  it("admite un municipio con dos trozos separados", () => {
    const small = way("outer", [41.6, 2.4], [41.6, 2.45], [41.65, 2.45], [41.65, 2.4], [41.6, 2.4])
    const b = boundaryFromRelations(rel(...Object.values(SIDES), small))
    expect(b.outer).toHaveLength(2)
    expect(insideBoundary(b, 41.62, 2.42)).toBe(true)
    expect(insideBoundary(b, 41.55, 2.35)).toBe(false)
  })

  it("ignora centro administrativo, subáreas y tramos sin geometría", () => {
    const b = boundaryFromRelations(
      rel(
        { type: "node", role: "admin_centre", ref: 5, lat: 41.45, lon: 2.25 },
        { type: "relation", role: "subarea", ref: 9 },
        { type: "way", role: "outer", ref: 77 },
        ...Object.values(SIDES),
      ),
    )
    expect(b.outer).toHaveLength(1)
    expect(insideBoundary(b, 41.45, 2.25)).toBe(true)
  })

  it("descarta los anillos que no cierran (datos incompletos)", () => {
    const b = boundaryFromRelations(rel(SIDES.south, SIDES.east, SIDES.north)) // falta el lado oeste
    expect(b.outer).toHaveLength(0)
    expect(insideBoundary(b, 41.45, 2.25)).toBe(false)
  })

  it("sin relaciones devuelve un contorno vacío", () => {
    expect(boundaryFromRelations([]).outer).toHaveLength(0)
    expect(boundaryFromRelations([{ type: "node", id: 1 }]).outer).toHaveLength(0)
  })
})

describe("boundaryBbox", () => {
  it("rodea el contorno con un pequeño margen", () => {
    const b = boundaryFromRelations(rel(...Object.values(SIDES)))
    const [s, w, n, e] = boundaryBbox(b, 0.01)
    expect(s).toBeCloseTo(41.39, 5)
    expect(w).toBeCloseTo(2.19, 5)
    expect(n).toBeCloseTo(41.51, 5)
    expect(e).toBeCloseTo(2.31, 5)
  })
})

describe("contorno con tramos que faltan (copia de servidor desactualizada)", () => {
  // El lado este queda partido con un hueco de ~55 m (0,0005° de latitud) en medio.
  const east1 = way("outer", [41.4, 2.3], [41.449, 2.3])
  const east2 = way("outer", [41.4495, 2.3], [41.5, 2.3])

  it("cierra el hueco en línea recta si es pequeño", () => {
    const b = boundaryFromRelations(rel(SIDES.south, east1, east2, SIDES.north, SIDES.west))
    expect(b.outer).toHaveLength(1)
    expect(b.gapsClosed).toBe(1)
    expect(insideBoundary(b, 41.45, 2.25)).toBe(true)
    expect(insideBoundary(b, 41.45, 2.35)).toBe(false)
  })

  it("también cuando un tramo viene vacío y deja dos cadenas sueltas", () => {
    const empty = { type: "way", role: "outer", geometry: [] }
    const b = boundaryFromRelations(rel(SIDES.south, east1, empty, east2, SIDES.north, SIDES.west))
    expect(b.outer).toHaveLength(1)
    expect(insideBoundary(b, 41.42, 2.22)).toBe(true)
  })

  it("no inventa nada si el hueco es enorme", () => {
    const far = way("outer", [41.46, 2.3], [41.5, 2.3]) // falta casi un lado entero (~4 km)
    const b = boundaryFromRelations(rel(SIDES.south, east1, far, SIDES.north, SIDES.west))
    expect(b.outer).toHaveLength(0)
  })

  it("con el contorno completo no marca huecos", () => {
    expect(boundaryFromRelations(rel(...Object.values(SIDES))).gapsClosed).toBeUndefined()
  })
})

describe("simplificar, medir y guardar", () => {
  const ring = (n: number) => {
    // círculo de ~1 km de radio con n puntos
    const pts = Array.from({ length: n }, (_, i) => ({ lat: 41.4 + 0.009 * Math.sin((2 * Math.PI * i) / n), lon: 2.2 + 0.012 * Math.cos((2 * Math.PI * i) / n) }))
    return [...pts, { ...pts[0] }]
  }

  it("simplificar quita puntos casi alineados y mantiene el cierre y la superficie", () => {
    const r = ring(360)
    const s = simplifyRing(r, 8)
    expect(s.length).toBeLessThan(r.length / 2)
    expect(s[0]).toEqual(s[s.length - 1])
    const a = boundaryAreaKm2({ outer: [r], inner: [] })
    const b = boundaryAreaKm2({ outer: [s], inner: [] })
    expect(b).toBeGreaterThan(a * 0.99)
    expect(b).toBeLessThanOrEqual(a)
  })

  it("la superficie de un círculo de 1 km x 1,3 km sale cerca de π·a·b", () => {
    const a = boundaryAreaKm2({ outer: [ring(720)], inner: [] })
    expect(a).toBeCloseTo(Math.PI * (0.009 * 111.32) * (0.012 * 111.32 * Math.cos((41.4 * Math.PI) / 180)), 1)
  })

  it("guardar en formato compacto y volver a leer no cambia nada", () => {
    const b = boundaryFromRelations(rel(...Object.values(SIDES)))
    const back = fromCompact(toCompact(b))
    expect(back.outer).toEqual(b.outer)
    expect(back.inner).toEqual([])
  })
})
