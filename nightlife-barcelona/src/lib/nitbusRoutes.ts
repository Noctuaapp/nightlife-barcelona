// Paradas de Nitbus, línea por línea y EN ORDEN (31/10/2026).
//
// Antes «Ver paradas» llevaba a un mapa con más de mil chinchetas mezcladas, donde no se veía nada.
// Ahora cada línea tiene su página con el recorrido como un esquema (cabecera → ... → cabecera), como
// el plano de la parada, pero legible en el móvil.
//
// De dónde salen los datos:
//  1) Tabla `nitbus_line_stops` (supabase/61): paradas de cada línea y sentido, en orden de recorrido,
//     que rellena la importación de OpenStreetMap (Admin › Ajustes y herramientas).
//  2) Mientras esa tabla esté vacía (no se ha ejecutado el SQL 61 o no se ha vuelto a importar), se
//     usan las paradas sueltas de `essentials` (categoría Nitbus), que ya están cargadas pero NO traen
//     orden: se enseñan por orden alfabético y la página avisa de ello. No se inventa ningún orden.
import { supabase } from "./supabase"
import { fetchAllPages } from "./fetchAll"

export type RouteRow = {
  line: string
  direction: number
  seq: number
  name: string
  latitude: number | null
  longitude: number | null
}

export type LooseStop = {
  name: string
  subcategory: string | null
  latitude: number | null
  longitude: number | null
}

export type NbStop = {
  name: string
  lat: number | null
  lon: number | null
  // Otras líneas nocturnas que paran en una parada con el mismo nombre (para hacer transbordo).
  others: string[]
}

export type NbDirection = { from: string; to: string; stops: NbStop[] }

export type NbLine = {
  code: string
  // true si las paradas llevan el orden del recorrido; false si es la lista alfabética de reserva.
  ordered: boolean
  directions: NbDirection[]
  // Paradas distintas de la línea (una parada que está en los dos sentidos cuenta una vez).
  stopCount: number
}

export type NbSearchEntry = { name: string; lines: string[] }

export type NbData = {
  lines: Record<string, NbLine>
  search: NbSearchEntry[]
}

export function lineNumber(code: string): number {
  const n = Number(code.replace(/\D/g, ""))
  return Number.isFinite(n) ? n : 0
}

export function compareLineCodes(a: string, b: string): number {
  return lineNumber(a) - lineNumber(b)
}

// Para comparar nombres de parada: sin acentos, mayúsculas ni signos («Pl. Catalunya» = «PL CATALUNYA»).
export function normStopName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

function stop(name: string, lat: number | null, lon: number | null): NbStop {
  return { name, lat, lon, others: [] }
}

// Une las paradas de varios sentidos de una línea sin repetir por nombre.
function distinctCount(directions: NbDirection[]): number {
  const seen = new Set<string>()
  for (const d of directions) for (const s of d.stops) seen.add(normStopName(s.name))
  return seen.size
}

export function buildNitbusData(rows: RouteRow[], loose: LooseStop[]): NbData {
  const lines: Record<string, NbLine> = {}

  if (rows.length > 0) {
    const byLine = new Map<string, Map<number, RouteRow[]>>()
    for (const r of rows) {
      const code = r.line.trim().toUpperCase()
      if (!byLine.has(code)) byLine.set(code, new Map())
      const dirs = byLine.get(code)!
      if (!dirs.has(r.direction)) dirs.set(r.direction, [])
      dirs.get(r.direction)!.push(r)
    }
    for (const [code, dirs] of byLine) {
      const directions: NbDirection[] = [...dirs.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, list]) => {
          const stops = list.sort((a, b) => a.seq - b.seq).map((r) => stop(r.name, r.latitude, r.longitude))
          return { from: stops[0]?.name || "", to: stops[stops.length - 1]?.name || "", stops }
        })
        .filter((d) => d.stops.length > 0)
      if (directions.length === 0) continue
      lines[code] = { code, ordered: true, directions, stopCount: distinctCount(directions) }
    }
  }

  // Líneas que no están en la tabla de recorridos (o toda la tabla vacía): paradas sueltas, A–Z.
  const looseByLine = new Map<string, NbStop[]>()
  for (const s of loose) {
    const codes = (s.subcategory || "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^N\d+$/.test(c))
    for (const code of codes) {
      if (lines[code]) continue
      if (!looseByLine.has(code)) looseByLine.set(code, [])
      looseByLine.get(code)!.push(stop(s.name, s.latitude, s.longitude))
    }
  }
  for (const [code, stops] of looseByLine) {
    const seen = new Set<string>()
    const unique = stops
      .filter((s) => {
        const k = normStopName(s.name)
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
    if (unique.length === 0) continue
    lines[code] = { code, ordered: false, directions: [{ from: "", to: "", stops: unique }], stopCount: unique.length }
  }

  // Transbordos y buscador: qué líneas paran en cada nombre de parada.
  const linesByName = new Map<string, { name: string; lines: Set<string> }>()
  for (const line of Object.values(lines)) {
    for (const d of line.directions) {
      for (const s of d.stops) {
        const k = normStopName(s.name)
        if (!k) continue
        if (!linesByName.has(k)) linesByName.set(k, { name: s.name, lines: new Set() })
        linesByName.get(k)!.lines.add(line.code)
      }
    }
  }
  for (const line of Object.values(lines)) {
    for (const d of line.directions) {
      for (const s of d.stops) {
        const entry = linesByName.get(normStopName(s.name))
        s.others = entry ? [...entry.lines].filter((c) => c !== line.code).sort(compareLineCodes) : []
      }
    }
  }

  const search = [...linesByName.values()]
    .map((e) => ({ name: e.name, lines: [...e.lines].sort(compareLineCodes) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))

  return { lines, search }
}

// Parada de una lista más cercana a un punto (null si ninguna tiene coordenadas).
export function nearestStop<T extends { lat: number | null; lon: number | null }>(
  stops: T[],
  lat: number,
  lon: number,
  distance: (lat1: number, lon1: number, lat2: number, lon2: number) => number
): { stop: T; index: number; meters: number } | null {
  let best: { stop: T; index: number; meters: number } | null = null
  stops.forEach((s, index) => {
    if (s.lat == null || s.lon == null) return
    const meters = distance(lat, lon, s.lat, s.lon)
    if (!best || meters < best.meters) best = { stop: s, index, meters }
  })
  return best
}

// Medidas aproximadas de un recorrido (31/10/2026): número de paradas y minutos de punta a punta.
// No hay horarios oficiales en los datos, así que el tiempo es una ESTIMACIÓN por distancia: se suma
// la distancia en línea recta entre paradas consecutivas, se pasa a distancia por calle (las calles
// no van en línea recta) y se divide por una velocidad media de autobús nocturno con sus paradas.
// Los dos números son supuestos nuestros, no datos de TMB: la web lo dice donde lo enseña.
export const ROAD_FACTOR = 1.25
export const AVG_KMH = 17

export type RouteStats = { stops: number; minutes: number | null }

type Distance = (lat1: number, lon1: number, lat2: number, lon2: number) => number

// Estadísticas de UN sentido (paradas en orden). Sin coordenadas suficientes no se inventa un tiempo.
export function directionStats(stops: { lat: number | null; lon: number | null }[], distance: Distance): RouteStats {
  const n = stops.length
  if (n < 2) return { stops: n, minutes: null }
  let meters = 0
  let pairs = 0
  for (let i = 1; i < n; i++) {
    const a = stops[i - 1]
    const b = stops[i]
    if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) continue
    meters += distance(a.lat, a.lon, b.lat, b.lon)
    pairs++
  }
  if (pairs < (n - 1) * 0.8) return { stops: n, minutes: null }
  // Si faltaban algunos tramos, se completan con la media de los que sí hay.
  const km = ((meters / pairs) * (n - 1)) / 1000
  const raw = ((km * ROAD_FACTOR) / AVG_KMH) * 60
  return { stops: n, minutes: Math.max(5, Math.round(raw / 5) * 5) }
}

// Resumen por línea a partir de filas de recorrido: se toma el sentido con más paradas.
export function summarizeRoutes(rows: RouteRow[], distance: Distance): Record<string, RouteStats> {
  const byLine = new Map<string, Map<number, RouteRow[]>>()
  for (const r of rows) {
    const code = r.line.trim().toUpperCase()
    if (!byLine.has(code)) byLine.set(code, new Map())
    const dirs = byLine.get(code)!
    if (!dirs.has(r.direction)) dirs.set(r.direction, [])
    dirs.get(r.direction)!.push(r)
  }
  const out: Record<string, RouteStats> = {}
  for (const [code, dirs] of byLine) {
    let best: RouteStats | null = null
    for (const list of dirs.values()) {
      const ordered = [...list].sort((a, b) => a.seq - b.seq)
      const st = directionStats(
        ordered.map((r) => ({ lat: r.latitude, lon: r.longitude })),
        distance
      )
      if (!best || st.stops > best.stops) best = st
    }
    if (best) out[code] = best
  }
  return out
}

// Servidor: lee las dos fuentes y construye los datos. Si falla la tabla (aún no existe) sigue con
// las paradas sueltas; si falla todo, devuelve vacío y la página lo explica.
export async function loadNitbusData(): Promise<NbData> {
  let rows: RouteRow[] = []
  try {
    rows = await fetchAllPages<RouteRow>((from, to) =>
      supabase
        .from("nitbus_line_stops")
        .select("line, direction, seq, name, latitude, longitude")
        .order("line")
        .order("direction")
        .order("seq")
        .range(from, to)
    )
  } catch {
    rows = []
  }

  let loose: LooseStop[] = []
  try {
    loose = await fetchAllPages<LooseStop>((from, to) =>
      supabase
        .from("essentials")
        .select("name, subcategory, latitude, longitude")
        .eq("category", "Nitbus")
        .eq("hidden", false)
        .order("id")
        .range(from, to)
    )
  } catch {
    loose = []
  }

  return buildNitbusData(rows, loose)
}
