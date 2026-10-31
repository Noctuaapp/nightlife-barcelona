// Del dato crudo de OpenStreetMap al recorrido ordenado de cada línea de Nitbus (31/10/2026).
// Lo usa la importación del admin (/api/admin/import-nitbus-stops). Está aparte, sin tocar red ni
// base de datos, para poder probarlo.
//
// En OpenStreetMap cada línea es una «relación» cuyos miembros (paradas) van EN ORDEN DE RECORRIDO,
// normalmente una relación por sentido. Aquí se coge el orden de esas listas.

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

// Hasta dos sentidos por línea: el recorrido más largo, y el más largo de los que empiezan o
// acaban en otro sitio (así no se cuelan variantes del mismo sentido). Una línea circular o con
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
    const ends = (s: Seq) => `${key(s[0].name)}>${key(s[s.length - 1].name)}`
    const second = sorted.slice(1).find((s) => ends(s) !== ends(first))
    ;[first, second].forEach((seq, direction) => {
      if (!seq) return
      seq.forEach((s, i) =>
        rows.push({ line, direction, seq: i + 1, name: s.name.slice(0, 120), code: s.code, latitude: s.lat, longitude: s.lon })
      )
    })
  }
  return rows.sort((a, b) => Number(a.line.slice(1)) - Number(b.line.slice(1)) || a.direction - b.direction || a.seq - b.seq)
}
