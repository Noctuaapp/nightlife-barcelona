import { hedgedOverpass, OVERPASS_MIRRORS } from "./overpassHedged"
import { boundaryBbox, boundaryFromRelations, insideBoundary } from "./osmBoundary"

// Todo lo que hay en un municipio, sin usar la función `area` de Overpass (ver osmBoundary.ts):
//   1) se pide el contorno del municipio (relación administrativa, con su geometría);
//   2) se piden los elementos con etiquetas simples dentro del rectángulo que lo contiene;
//   3) aquí se descartan los que caen fuera del contorno (municipios vecinos).
// Las dos consultas son baratas y las resuelve cualquier servidor, también los que no tienen áreas.

const METRO_BBOX = "(41.15,1.75,41.70,2.50)" // cubre Barcelona y todo su entorno; solo para elegir la relación

export type AreaFetch =
  | { ok: true; elements: any[]; descartados_fuera_del_municipio: number }
  | { ok: false; error: string; status: number }

export async function fetchAreaElements(opts: {
  pattern: string // alternativas literales del nombre en OpenStreetMap, p. ej. «Badalona»
  label: string // nombre para los mensajes
  blocks: (scope: string) => string[] // filtros de Overpass; reciben el rectángulo «(s,w,n,e)»
  errors: string[]
  mirrors?: string[]
}): Promise<AreaFetch> {
  const { pattern, label, blocks, errors } = opts
  const mirrors = opts.mirrors ?? OVERPASS_MIRRORS
  const why = () => (errors.length ? ` Motivo: ${[...new Set(errors)].join("; ")}` : "")

  const boundaryQuery = `[out:json][timeout:20][maxsize:67108864];\nrel["boundary"="administrative"]["admin_level"="8"]["name"~"^${pattern}$"]${METRO_BBOX};\nout geom;`
  const rels = await hedgedOverpass({ mirrors, query: boundaryQuery, totalMs: 20000, staggerMs: 5000, errors })
  if (rels === null) {
    return { ok: false, status: 502, error: `No he podido leer el contorno de ${label} desde OpenStreetMap. Prueba otra vez en uno o dos minutos.${why()}` }
  }
  const boundary = boundaryFromRelations(rels)
  if (boundary.outer.length === 0) {
    return { ok: false, status: 502, error: `OpenStreetMap no me ha dado el contorno de ${label} (${rels.length} relaciones, ninguna cerrada). Prueba otra vez en un rato.${why()}` }
  }

  const [s, w, n, e] = boundaryBbox(boundary)
  const scope = `(${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)})`
  const dataQuery = `[out:json][timeout:30][maxsize:134217728];\n(\n  ${blocks(scope).join("\n  ")}\n);\nout center tags;`
  const els = await hedgedOverpass({ mirrors, query: dataQuery, totalMs: 32000, staggerMs: 8000, errors })
  if (els === null) {
    return { ok: false, status: 502, error: `Los servidores de OpenStreetMap no respondieron. Prueba otra vez en uno o dos minutos.${why()}` }
  }

  let fuera = 0
  const elements = els.filter((el) => {
    const lat = Number(el.lat ?? el.center?.lat)
    const lon = Number(el.lon ?? el.center?.lon)
    if (!isFinite(lat) || !isFinite(lon)) return true // sin coordenadas: lo decide el importador
    if (insideBoundary(boundary, lat, lon)) return true
    fuera++
    return false
  })
  return { ok: true, elements, descartados_fuera_del_municipio: fuera }
}
