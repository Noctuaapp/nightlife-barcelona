// Contorno de un municipio a partir de la relación de OpenStreetMap (`out geom`), y «¿este punto
// cae dentro?». Sustituye a la función `area` de Overpass, que varios servidores públicos no tienen
// (el de openstreetmap.fr da «area_tags_local.bin: No such file») o tienen saturada.

export type Pt = { lat: number; lon: number }
export type Boundary = { outer: Pt[][]; inner: Pt[][]; gapsClosed?: number } // gapsClosed: huecos del contorno cerrados en línea recta

const same = (a: Pt, b: Pt) => Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lon - b.lon) < 1e-7

// Une los tramos (ways) que comparten extremos hasta cerrar anillos. Devuelve los anillos cerrados
// y las cadenas que se han quedado abiertas (si falta algún tramo en los datos).
function stitch(ways: Pt[][]): { closed: Pt[][]; open: Pt[][] } {
  const pool = ways.map((w) => w.slice())
  const closed: Pt[][] = []
  const open: Pt[][] = []
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
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) closed.push(ring)
    else if (ring.length >= 2) open.push(ring)
  }
  return { closed, open }
}

// Distancia aproximada en metros (basta para huecos de unas decenas de metros).
function gapMeters(a: Pt, b: Pt): number {
  const dLat = (a.lat - b.lat) * 111_320
  const dLon = (a.lon - b.lon) * 111_320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.hypot(dLat, dLon)
}

// Si en los datos de OpenStreetMap falta algún tramo del contorno (pasa con copias de servidor
// desactualizadas), se cierran los huecos con una línea recta entre los dos extremos más cercanos,
// siempre que estén a menos de `maxGap` metros. Devuelve los anillos que así se consiguen cerrar.
function closeGaps(open: Pt[][], maxGap: number): { rings: Pt[][]; gaps: number } {
  const chains = open.map((c) => c.slice())
  const rings: Pt[][] = []
  let gaps = 0
  for (;;) {
    let best: { d: number; i: number; j: number; mode: "self" | "ee" | "es" | "se" | "ss" } | null = null
    for (let i = 0; i < chains.length; i++) {
      const a = chains[i]
      const self = gapMeters(a[0], a[a.length - 1])
      if (a.length >= 3 && self <= maxGap && (!best || self < best.d)) best = { d: self, i, j: i, mode: "self" }
      for (let j = i + 1; j < chains.length; j++) {
        const b = chains[j]
        const cands: [number, "ee" | "es" | "se" | "ss"][] = [
          [gapMeters(a[a.length - 1], b[0]), "ee"], // fin de a con principio de b
          [gapMeters(a[a.length - 1], b[b.length - 1]), "es"], // fin con fin
          [gapMeters(a[0], b[b.length - 1]), "se"], // principio de a con fin de b
          [gapMeters(a[0], b[0]), "ss"], // principio con principio
        ]
        for (const [d, mode] of cands) if (d <= maxGap && (!best || d < best.d)) best = { d, i, j, mode }
      }
    }
    if (!best) break
    gaps++
    if (best.mode === "self") {
      const c = chains.splice(best.i, 1)[0]
      rings.push([...c, c[0]])
      continue
    }
    const a = chains[best.i]
    const b = chains[best.j]
    let merged: Pt[]
    if (best.mode === "ee") merged = a.concat(b)
    else if (best.mode === "es") merged = a.concat(b.slice().reverse())
    else if (best.mode === "se") merged = b.concat(a)
    else merged = b.slice().reverse().concat(a)
    chains.splice(best.j, 1)
    chains.splice(best.i, 1, merged)
  }
  return { rings, gaps }
}

export function boundaryFromRelations(elements: any[], maxGapMeters = 300): Boundary {
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
  const o = stitch(outer)
  const i = stitch(inner)
  let gaps = 0
  const outerRings = o.closed
  if (o.open.length > 0) {
    const fixed = closeGaps(o.open, maxGapMeters)
    outerRings.push(...fixed.rings)
    gaps += fixed.gaps
  }
  const innerRings = i.closed
  if (i.open.length > 0) innerRings.push(...closeGaps(i.open, maxGapMeters).rings)
  return { outer: outerRings, inner: innerRings, ...(gaps > 0 ? { gapsClosed: gaps } : {}) }
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

// ---- Contornos guardados en la web ----------------------------------------------------------
// Los límites de un municipio casi no cambian, así que los de los municipios que se importan se
// guardan ya simplificados (lib/osmBoundaries.ts) y no hace falta pedirlos a OpenStreetMap cada vez.

const M = 111_320
function project(p: Pt, lat0: number, lon0: number): [number, number] {
  return [(p.lon - lon0) * M * Math.cos(lat0 * (Math.PI / 180)), (p.lat - lat0) * M]
}

function segDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

// Douglas-Peucker sobre un anillo cerrado: quita puntos que se desvían menos de `tolMeters`.
export function simplifyRing(ring: Pt[], tolMeters: number): Pt[] {
  if (ring.length <= 4) return ring
  const lat0 = ring[0].lat, lon0 = ring[0].lon
  const xy = ring.map((p) => project(p, lat0, lon0))
  const keep = new Array(ring.length).fill(false)
  keep[0] = keep[ring.length - 1] = true
  const dp = (lo: number, hi: number) => {
    let worst = -1, idx = -1
    for (let i = lo + 1; i < hi; i++) {
      const d = segDist(xy[i], xy[lo], xy[hi])
      if (d > worst) { worst = d; idx = i }
    }
    if (idx >= 0 && worst > tolMeters) { keep[idx] = true; dp(lo, idx); dp(idx, hi) }
  }
  // anillo cerrado: se parte por el punto más lejano al inicio para que la «línea base» no sea un punto
  let far = 1, farD = -1
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(xy[i][0], xy[i][1])
    if (d > farD) { farD = d; far = i }
  }
  keep[far] = true
  dp(0, far)
  dp(far, ring.length - 1)
  return ring.filter((_, i) => keep[i])
}

export function simplifyBoundary(b: Boundary, tolMeters: number): Boundary {
  const r5 = (n: number) => Math.round(n * 1e5) / 1e5
  const fix = (rings: Pt[][]) => rings
    .map((r) => simplifyRing(r, tolMeters).map((p) => ({ lat: r5(p.lat), lon: r5(p.lon) })))
    .filter((r) => r.length >= 4)
  return { outer: fix(b.outer), inner: fix(b.inner), ...(b.gapsClosed ? { gapsClosed: b.gapsClosed } : {}) }
}

// Superficie en km² (para comprobar que un contorno es el que toca).
export function boundaryAreaKm2(b: Boundary): number {
  const area = (ring: Pt[]) => {
    const lat0 = ring[0].lat, lon0 = ring[0].lon
    const xy = ring.map((p) => project(p, lat0, lon0))
    let s = 0
    for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) s += xy[j][0] * xy[i][1] - xy[i][0] * xy[j][1]
    return Math.abs(s) / 2 / 1e6
  }
  return b.outer.reduce((t, r) => t + area(r), 0) - b.inner.reduce((t, r) => t + area(r), 0)
}

// Formato compacto para guardarlo en el código: anillos de pares [lat, lon].
export type CompactBoundary = { outer: [number, number][][]; inner?: [number, number][][] }
export function toCompact(b: Boundary): CompactBoundary {
  const c = (rings: Pt[][]) => rings.map((r) => r.map((p) => [p.lat, p.lon] as [number, number]))
  return { outer: c(b.outer), ...(b.inner.length ? { inner: c(b.inner) } : {}) }
}
export function fromCompact(c: CompactBoundary): Boundary {
  const f = (rings: [number, number][][]) => rings.map((r) => r.map(([lat, lon]) => ({ lat, lon })))
  return { outer: f(c.outer), inner: f(c.inner || []) }
}
