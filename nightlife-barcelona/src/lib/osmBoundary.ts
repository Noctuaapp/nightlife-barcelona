// Contorno de un municipio a partir de la relación de OpenStreetMap (`out geom`), y «¿este punto
// cae dentro?». Sustituye a la función `area` de Overpass, que varios servidores públicos no tienen
// (el de openstreetmap.fr da «area_tags_local.bin: No such file») o tienen saturada.

export type Pt = { lat: number; lon: number }
export type Boundary = { outer: Pt[][]; inner: Pt[][] }

const same = (a: Pt, b: Pt) => Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lon - b.lon) < 1e-7

// Une los tramos (ways) que comparten extremos hasta cerrar anillos. Los anillos que no cierran se descartan.
function stitch(ways: Pt[][]): Pt[][] {
  const pool = ways.map((w) => w.slice())
  const rings: Pt[][] = []
  while (pool.length > 0) {
    let ring = pool.shift()!
    let grew = true
    while (grew && !(ring.length >= 4 && same(ring[0], ring[ring.length - 1]))) {
      grew = false
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i]
        const last = ring[ring.length - 1]
        if (same(last, w[0])) ring = ring.concat(w.slice(1))
        else if (same(last, w[w.length - 1])) ring = ring.concat(w.slice(0, -1).reverse())
        else if (same(ring[0], w[w.length - 1])) ring = w.slice(0, -1).concat(ring)
        else if (same(ring[0], w[0])) ring = w.slice(1).reverse().concat(ring)
        else continue
        pool.splice(i, 1)
        grew = true
        break
      }
    }
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) rings.push(ring)
  }
  return rings
}

export function boundaryFromRelations(elements: any[]): Boundary {
  const outer: Pt[][] = []
  const inner: Pt[][] = []
  for (const el of elements) {
    if (el?.type !== "relation") continue
    for (const m of el.members || []) {
      if (m?.type !== "way" || !Array.isArray(m.geometry)) continue
      const pts: Pt[] = m.geometry
        .filter((g: any) => g && typeof g.lat === "number" && typeof g.lon === "number")
        .map((g: any) => ({ lat: g.lat, lon: g.lon }))
      if (pts.length < 2) continue
      if (m.role === "inner") inner.push(pts)
      else if (m.role === "outer" || !m.role) outer.push(pts)
    }
  }
  return { outer: stitch(outer), inner: stitch(inner) }
}

function inRing(lat: number, lon: number, ring: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if (a.lat > lat !== b.lat > lat && lon < ((b.lon - a.lon) * (lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside
  }
  return inside
}

export function insideBoundary(b: Boundary, lat: number, lon: number): boolean {
  return b.outer.some((r) => inRing(lat, lon, r)) && !b.inner.some((r) => inRing(lat, lon, r))
}

// Rectángulo que contiene el contorno, un poco ampliado: (sur, oeste, norte, este).
export function boundaryBbox(b: Boundary, pad = 0.002): [number, number, number, number] {
  let s = Infinity, w = Infinity, n = -Infinity, e = -Infinity
  for (const ring of b.outer) for (const p of ring) {
    if (p.lat < s) s = p.lat
    if (p.lat > n) n = p.lat
    if (p.lon < w) w = p.lon
    if (p.lon > e) e = p.lon
  }
  return [s - pad, w - pad, n + pad, e + pad]
}
