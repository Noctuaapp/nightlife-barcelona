import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchAreaElements } from "../osmAreaFetch"

const g = (lat: number, lon: number) => ({ lat, lon })
const way = (...pts: [number, number][]) => ({ type: "way", role: "outer", geometry: pts.map(([a, b]) => g(a, b)) })
// Municipio de prueba: cuadrado 41.40–41.50 / 2.20–2.30
const SQUARE_REL = [{ type: "relation", id: 1, members: [
  way([41.4, 2.2], [41.4, 2.3]), way([41.4, 2.3], [41.5, 2.3]), way([41.5, 2.3], [41.5, 2.2]), way([41.5, 2.2], [41.4, 2.2]),
] }]

const MIRRORS = ["https://a.example/api", "https://b.example/api"]
const ok = (elements: any[]) => ({ ok: true, status: 200, json: async () => ({ elements }) })
const bad = (status: number) => ({ ok: false, status, json: async () => ({}) })
const remark = (r: string) => ({ ok: true, status: 200, json: async () => ({ elements: [], remark: r }) })

const queryOf = (init: any) => decodeURIComponent(String(init.body).slice(5))
const isBoundary = (q: string) => q.includes("out geom")
const blocks = (scope: string) => [`nwr${scope}["amenity"="pharmacy"];`]

afterEach(() => vi.unstubAllGlobals())

describe("fetchAreaElements", () => {
  it("pide el contorno y los datos sin usar nunca la función area, y descarta lo de fuera", async () => {
    const queries: string[] = []
    vi.stubGlobal("fetch", async (_u: string, init: any) => {
      const q = queryOf(init)
      queries.push(q)
      return isBoundary(q)
        ? ok(SQUARE_REL)
        : ok([
            { type: "node", id: 1, lat: 41.45, lon: 2.25, tags: { name: "dentro" } },
            { type: "way", id: 2, center: { lat: 41.42, lon: 2.21 }, tags: { name: "dentro (centro de un edificio)" } },
            { type: "node", id: 3, lat: 41.45, lon: 2.3005, tags: { name: "vecino" } }, // en el margen del rectángulo, fuera del contorno
          ])
    })
    const errors: string[] = []
    const r = await fetchAreaElements({ pattern: "Badalona", label: "Badalona", blocks, errors, mirrors: MIRRORS })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.elements.map((e) => e.id)).toEqual([1, 2])
    expect(r.descartados_fuera_del_municipio).toBe(1)
    expect(queries).toHaveLength(2)
    expect(queries[0]).toContain('["name"~"^Badalona$"]')
    expect(queries[0]).toContain('"admin_level"="8"')
    expect(queries[1]).toContain('["amenity"="pharmacy"]')
    expect(queries[1]).toMatch(/nwr\(41\.39800,2\.19800,41\.50200,2\.30200\)/)
    for (const q of queries) expect(q).not.toMatch(/\barea\b|map_to_area|\(area/)
  })

  it("sigue con otro servidor cuando uno no tiene la base de áreas o está caído", async () => {
    const seen: string[] = []
    vi.stubGlobal("fetch", async (url: string, init: any) => {
      seen.push(url)
      if (url === MIRRORS[0]) return remark("runtime error: open64: 2 No such file or directory /data/work/overpass/database/area_tags_local.bin")
      return isBoundary(queryOf(init)) ? ok(SQUARE_REL) : ok([{ type: "node", id: 1, lat: 41.45, lon: 2.25, tags: {} }])
    })
    const errors: string[] = []
    const r = await fetchAreaElements({ pattern: "Badalona", label: "Badalona", blocks, errors, mirrors: MIRRORS })
    expect(r.ok).toBe(true)
    expect(errors.join(" ")).toContain("area_tags_local.bin")
    expect(seen).toContain(MIRRORS[1])
  })

  it("si no consigue el contorno, lo dice con el motivo", async () => {
    vi.stubGlobal("fetch", async () => bad(502))
    const errors: string[] = []
    const r = await fetchAreaElements({ pattern: "Badalona", label: "Badalona", blocks, errors, mirrors: MIRRORS })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.status).toBe(502)
    expect(r.error).toMatch(/contorno de Badalona/)
    expect(r.error).toMatch(/Motivo: .*502/)
  })

  it("si el contorno llega incompleto, no importa nada", async () => {
    vi.stubGlobal("fetch", async () => ok([{ type: "relation", id: 1, members: [way([41.4, 2.2], [41.4, 2.3])] }]))
    const r = await fetchAreaElements({ pattern: "Badalona", label: "Badalona", blocks, errors: [], mirrors: MIRRORS })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/contorno de Badalona/)
  })

  it("si los datos no llegan, devuelve el error con el motivo", async () => {
    vi.stubGlobal("fetch", async (_u: string, init: any) => (isBoundary(queryOf(init)) ? ok(SQUARE_REL) : bad(504)))
    const errors: string[] = []
    const r = await fetchAreaElements({ pattern: "Badalona", label: "Badalona", blocks, errors, mirrors: MIRRORS })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/no respondieron/)
    expect(r.error).toMatch(/Motivo: .*504/)
  })

  it("deja pasar los elementos sin coordenadas para que decida el importador", async () => {
    vi.stubGlobal("fetch", async (_u: string, init: any) => (isBoundary(queryOf(init)) ? ok(SQUARE_REL) : ok([{ type: "relation", id: 9, tags: {} }])))
    const r = await fetchAreaElements({ pattern: "Badalona", label: "Badalona", blocks, errors: [], mirrors: MIRRORS })
    expect(r.ok && r.elements.length).toBe(1)
  })
})
