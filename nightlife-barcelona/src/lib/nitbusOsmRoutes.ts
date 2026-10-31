// Del dato crudo de OpenStreetMap al recorrido ordenado de cada línea de Nitbus (31/10/2026).
// Lo usa la importación del admin (/api/admin/import-nitbus-stops). Está aparte, sin tocar red ni
// base de datos, para poder probarlo.
//
// En OpenStreetMap cada línea es una «relación» cuyos miembros (paradas) van EN ORDEN DE RECORRIDO,
// normalmente una relación por sentido. Aquí se coge el orden de esas listas.

import { distanceInMeters } from "./geo"

export type OsmMember = { type: string; ref: number; role: string }
export type OsmRelationLike = { tags?: Record<string, string>; members?: OsmMember[] }
export type OsmNodeLike = { lat?: number; lon?: number; tags?: Record<string, string> }

export type RouteStopRow = {
  line: string
  direction: number
  seq: number
  name: string
  code: string | null
  latitude: number
  longitude: number
}

const MAX_STOPS_PER_DIRECTION = 200

export function cleanStopName(name: string): string {
  return name.replace(/\s+/g, " ").trim().replace(/^(parada|stop)\s*[:\-]?\s*/i, "").trim()
}

function key(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

type Seq = { name: string; code: string | null; lat: number; lon: number }[]

// Paradas de UNA relación, en orden. Se usan los «platform» (el poste, donde espera la gente) y, si
// la relación no tiene, los «stop». Se descartan las que no tienen nombre o coordenadas, y se juntan
// las repetidas seguidas (poste + punto de calzada de la misma parada).
function sequenceOf(rel: OsmRelationLike, nodes: Map<number, OsmNodeLike>): Seq {
  const members = (rel.members || []).filter((m) => m.type === "node")
  const platforms = members.filter((m) => /^platform/.test(m.role))
  const chosen = platforms.length > 0 ? platforms : members.filter((m) => /^stop/.test(m.role))
  const out: Seq = []
  for (const m of chosen) {
    const n = nodes.get(m.ref)
    if (!n || typeof n.lat !== "number" || typeof n.lon !== "number") continue
    const name = cleanStopName(n.tags?.name || n.tags?.["name:ca"] || n.tags?.["name:es"] || "")
    if (!name) continue
    const prev = out[out.length - 1]
    if (prev && key(prev.name) === key(name)) continue
    const code = (n.tags?.ref || n.tags?.["ref:tmb"] || n.tags?.["ref:amb"] || "").trim() || null
    out.push({ name, code, lat: Number(n.lat.toFixed(6)), lon: Number(n.lon.toFixed(6)) })
  }
  return out.slice(0, MAX_STOPS_PER_DIRECTION)
}

// Una línea suele tener varias relaciones: los dos sentidos y variantes de cada uno (salidas
// cortas, desvíos…). El segundo sentido tiene que ser el CONTRARIO del primero, no otra variante
// del mismo (31/10/2026: en la N9 se coló una variante que acababa también en Pl. Catalunya, y los
// dos sentidos salían iguales). Es el contrario si:
//  - acaba lejos de donde acaba el primero (otro extremo de la línea), y
//  - empieza cerca de donde acaba el primero (las cabeceras de ida y vuelta suelen estar a una
//    calle de distancia, no en el mismo poste).
// Se compara por coordenadas, no por nombre, porque un mismo extremo cambia de nombre entre
// relaciones. Entre las que valen, la más larga.
const OPPOSITE_ENDS_APART_M = 500
const OPPOSITE_TERMINAL_GAP_M = 2500

type SeqStop = Seq[number]
const apart = (a: SeqStop, b: SeqStop) => distanceInMeters(a.lat, a.lon, b.lat, b.lon)

function pickOpposite(first: Seq, rest: Seq[]): Seq | undefined {
  const firstEnd = first[first.length - 1]
  return rest
    .filter((s) => {
      const start = s[0]
      const end = s[s.length - 1]
      return apart(firstEnd, end) >= OPPOSITE_ENDS_APART_M && apart(firstEnd, start) <= OPPOSITE_TERMINAL_GAP_M
    })
    .sort((a, b) => b.length - a.length)[0]
}

// Hasta dos sentidos por línea: el recorrido más largo y su contrario. Una línea circular o con
// un solo sentido en el mapa se queda con uno.
export function buildRouteRows(routes: OsmRelationLike[], nodes: Map<number, OsmNodeLike>): RouteStopRow[] {
  const byLine = new Map<string, Seq[]>()
  for (const rel of routes) {
    const line = (rel.tags?.ref || "").toUpperCase().trim()
    if (!/^N\d{1,2}$/.test(line)) continue
    const seq = sequenceOf(rel, nodes)
    if (seq.length < 2) continue
    if (!byLine.has(line)) byLine.set(line, [])
    byLine.get(line)!.push(seq)
  }

  const rows: RouteStopRow[] = []
  for (const [line, candidates] of byLine) {
    const sorted = [...candidates].sort((a, b) => b.length - a.length)
    const first = sorted[0]
    const second = pickOpposite(first, sorted.slice(1))
    ;[first, second].forEach((seq, direction) => {
      if (!seq) return
      seq.forEach((s, i) =>
        rows.push({ line, direction, seq: i + 1, name: s.name.slice(0, 120), code: s.code, latitude: s.lat, longitude: s.lon })
      )
    })
  }
  return rows.sort((a, b) => Number(a.line.slice(1)) - Number(b.line.slice(1)) || a.direction - b.direction || a.seq - b.seq)
}
