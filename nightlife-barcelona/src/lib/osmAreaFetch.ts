import { hedgedOverpass, OVERPASS_MIRRORS } from "./overpassHedged"
import { boundaryAreaKm2, boundaryBbox, boundaryFromRelations, insideBoundary, type Boundary } from "./osmBoundary"

// Todo lo que hay en un municipio, sin usar la función `area` de Overpass (ver osmBoundary.ts):
//   1) se pide el contorno del municipio (relación administrativa, con su geometría);
//   2) se piden los elementos con etiquetas simples dentro del rectángulo que lo contiene;
//   3) aquí se descartan los que caen fuera del contorno (municipios vecinos).
// Las dos consultas son baratas y las resuelve cualquier servidor, también los que no tienen áreas.

const METRO_BBOX = "(41.15,1.75,41.70,2.50)" // cubre Barcelona y todo su entorno; solo para elegir la relación

export type AreaFetch =
  | { ok: true; elements: any[]; descartados_fuera_del_municipio: number; contorno_huecos_cerrados?: number }
  | { ok: false; error: string; status: number }

export async function fetchAreaElements(opts: {
  pattern: string // alternativas literales del nombre en OpenStreetMap, p. ej. «Badalona»
  label: string // nombre para los mensajes
  blocks: (scope: string) => string[] // filtros de Overpass; reciben el rectángulo «(s,w,n,e)»
  errors: string[]
  mirrors?: string[]
  boundary?: Boundary | null // contorno ya conocido (lib/osmBoundaries.ts): si se pasa, no se pide a OpenStreetMap
  minAreaKm2?: number // si el contorno pedido a OpenStreetMap sale con menos superficie, está incompleto
  staggerMs?: number // cada cuánto se pregunta a un servidor más si el anterior no ha contestado
}): Promise<AreaFetch> {
  const { pattern, label, blocks, errors } = opts
  const mirrors = opts.mirrors ?? OVERPASS_MIRRORS
  const staggerMs = opts.staggerMs ?? 1500
  const why = () => (errors.length ? ` Motivo: ${[...new Set(errors)].join("; ")}` : "")

  let boundary = opts.boundary ?? null
  if (!boundary) {
    const boundaryQuery = `[out:json][timeout:18][maxsize:67108864];\nrel["boundary"="administrative"]["admin_level"="8"]["name"~"^${pattern}$"]${METRO_BBOX};\nout geom;`
    const rels = await hedgedOverpass({ mirrors, query: boundaryQuery, totalMs: 18000, staggerMs, errors })
    if (rels === null) {
      return { ok: false, status: 502, error: `No he podido leer el contorno de ${label} desde OpenStreetMap. Prueba otra vez en uno o dos minutos.${why()}` }
    }
    boundary = boundaryFromRelations(rels)
    if (boundary.outer.length === 0) {
      return { ok: false, status: 502, error: `OpenStreetMap no me ha dado el contorno de ${label} (${rels.length} relaciones, ninguna cerrada). Prueba otra vez en un rato.${why()}` }
    }
    if (opts.minAreaKm2 && boundaryAreaKm2(boundary) < opts.minAreaKm2) {
      return { ok: false, status: 502, error: `El contorno de ${label} que da OpenStreetMap está incompleto (${boundaryAreaKm2(boundary).toFixed(1)} km²). Prueba en un rato.${why()}` }
    }
  }

  const [s, w, n, e] = boundaryBbox(boundary)
  const scope = `(${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)})`
  const dataQuery = `[out:json][timeout:28][maxsize:134217728];\n(\n  ${blocks(scope).join("\n  ")}\n);\nout center tags;`
  // Un servidor que se cuelga se come todo el plazo; reintentar con plazos cortos suele acertar a
  // la segunda (con el contorno ya guardado caben tres intentos de 12 s en el minuto de Vercel).
  const rounds = opts.boundary ? 3 : 1
  const roundMs = opts.boundary ? 12000 : 30000
  let els: any[] | null = null
  for (let r = 0; r < rounds && els === null; r++) {
    els = await hedgedOverpass({ mirrors, query: dataQuery, totalMs: roundMs, staggerMs, errors })
  }
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
  return { ok: true, elements, descartados_fuera_del_municipio: fuera, ...(boundary.gapsClosed ? { contorno_huecos_cerrados: boundary.gapsClosed } : {}) }
}
