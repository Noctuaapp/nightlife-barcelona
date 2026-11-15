import { MADRID_METRO_LINES, MADRID_METRO_STATIONS } from "./madridMetro"
import { BUHO_LINES, BUHO_STOPS, type BuhoLine } from "./madridBuhos"
import type { NbLine, NbSearchEntry, NbStop } from "./nitbusRoutes"

// Metro y búhos de Madrid como páginas propias (15/11/2026): /madrid/metro y /madrid/buhos, hermanas de /metro y /nitbus de
// Barcelona. Aquí se ponen los datos fijos (lib/madridMetro.ts, del CRTM, y lib/madridBuhos.ts, de la EMT) en el formato que
// espera la vista de línea (NbLine), y las listas de líneas y de estaciones/paradas para el índice y el buscador.
// Este módulo pesa (los búhos son ~110 KB): solo lo importan páginas de servidor, nunca un componente de cliente.

// ───────────────────────────── Metro ─────────────────────────────

/** Orden de las líneas: L1 a L12 y el Ramal (R). */
const METRO_ORDER = (code: string) => (code === "R" ? 100 : Number(code.replace(/\D/g, "")) || 99)

export const MADRID_METRO_CODES: string[] = MADRID_METRO_LINES.map((l) => l.code).sort((a, b) => METRO_ORDER(a) - METRO_ORDER(b))

const METRO_BY_CODE = new Map(MADRID_METRO_LINES.map((l) => [l.code, l]))
const STATION_BY_NAME = new Map(MADRID_METRO_STATIONS.map((s) => [s.name, s]))

export function isMadridMetroLine(code: string): boolean {
  return METRO_BY_CODE.has(code.toUpperCase())
}

const metroCache = new Map<string, NbLine>()

/** La línea de metro como la espera NitbusLineView: dos sentidos (ida y vuelta) con sus estaciones en orden. null si no existe. */
export function buildMadridMetroLine(rawCode: string): NbLine | null {
  const code = rawCode.toUpperCase()
  const src = METRO_BY_CODE.get(code)
  if (!src) return null
  const hit = metroCache.get(code)
  if (hit) return hit
  const fwd: NbStop[] = src.stations.map((name) => {
    const st = STATION_BY_NAME.get(name)
    const others = (st?.lines ?? []).filter((l) => l !== code).sort((a, b) => METRO_ORDER(a) - METRO_ORDER(b))
    return { name, lat: st?.lat ?? null, lon: st?.lon ?? null, others }
  })
  const first = src.stations[0]
  const last = src.stations[src.stations.length - 1]
  const line: NbLine = {
    code,
    ordered: true,
    directions: [
      { from: first, to: last, stops: fwd },
      { from: last, to: first, stops: [...fwd].reverse() },
    ],
    stopCount: src.stations.length,
  }
  // L6 y L12 dan la vuelta: no tienen cabeceras ni «inicio» y «final» (la lista solo marca dónde se ha cortado el círculo).
  if (src.circular) line.circular = true
  metroCache.set(code, line)
  return line
}

/** «Pinar de Chamartín ↔ Valdecarros»; en las circulares, su nombre («Circular», «MetroSur»). */
export function madridMetroSummary(code: string): string {
  const src = METRO_BY_CODE.get(code.toUpperCase())
  if (!src) return ""
  if (src.circular) return src.name
  return `${src.stations[0]} ↔ ${src.stations[src.stations.length - 1]}`
}

/** Primera y última estación de la lista (en una línea circular, donde se corta el círculo). */
export function madridMetroEnds(code: string): { first: string; last: string } | null {
  const src = METRO_BY_CODE.get(code.toUpperCase())
  return src ? { first: src.stations[0], last: src.stations[src.stations.length - 1] } : null
}

export function isMadridMetroCircular(code: string): boolean {
  return !!METRO_BY_CODE.get(code.toUpperCase())?.circular
}

/** Buscador del índice: cada estación con las líneas que paran en ella (en orden de línea). */
export function madridMetroSearch(): NbSearchEntry[] {
  return MADRID_METRO_STATIONS.filter((s) => (s.lines ?? []).length > 0)
    .map((s) => ({ name: s.name, lines: [...(s.lines ?? [])].sort((a, b) => METRO_ORDER(a) - METRO_ORDER(b)) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
}

// ───────────────────────────── Búhos ─────────────────────────────

// N1 a N32 y, al final, las circulares NC1 y NC2 (que unen Cuatro Caminos y Atocha).
const buhoOrder = (code: string) => Number(code.replace(/\D/g, "")) + (code.startsWith("NC") ? 1000 : 0)

export const MADRID_BUHO_CODES: string[] = BUHO_LINES.map((l) => l.code).sort((a, b) => buhoOrder(a) - buhoOrder(b))

const BUHO_BY_CODE = new Map<string, BuhoLine>(BUHO_LINES.map((l) => [l.code, l]))

export function isMadridBuhoLine(code: string): boolean {
  return BUHO_BY_CODE.has(code.toUpperCase())
}

// Nombre de parada → líneas búho que paran en una parada con ese nombre (para los transbordos y el buscador).
let linesByStopName: Map<string, Set<string>> | null = null
function stopNameIndex(): Map<string, Set<string>> {
  if (linesByStopName) return linesByStopName
  const idx = new Map<string, Set<string>>()
  for (const line of BUHO_LINES)
    for (const dir of [0, 1] as const)
      for (const i of line.stops[dir]) {
        const name = BUHO_STOPS[i][1]
        let set = idx.get(name)
        if (!set) idx.set(name, (set = new Set()))
        set.add(line.code)
      }
  linesByStopName = idx
  return idx
}

const buhoCache = new Map<string, NbLine>()

/** La línea búho como la espera NitbusLineView: un sentido por cada destino, con sus paradas en orden. null si no existe. */
export function buildMadridBuhoLine(rawCode: string): NbLine | null {
  const code = rawCode.toUpperCase()
  const src = BUHO_BY_CODE.get(code)
  if (!src) return null
  const hit = buhoCache.get(code)
  if (hit) return hit
  const idx = stopNameIndex()
  const stopsOf = (dir: 0 | 1): NbStop[] =>
    src.stops[dir].map((i) => {
      const [, name, lat, lon] = BUHO_STOPS[i]
      const others = Array.from(idx.get(name) ?? []).filter((c) => c !== code).sort((a, b) => buhoOrder(a) - buhoOrder(b))
      return { name, lat, lon, others }
    })
  const names = new Set<string>()
  const directions = ([0, 1] as const).map((dir) => {
    const stops = stopsOf(dir)
    for (const s of stops) names.add(s.name)
    return { from: src.heads[dir === 0 ? 1 : 0], to: src.heads[dir], stops }
  })
  const line: NbLine = { code, ordered: true, directions, stopCount: names.size }
  buhoCache.set(code, line)
  return line
}

/** «Plaza de Cibeles ↔ Sanchinarro»: los dos extremos de la línea. */
export function madridBuhoSummary(code: string): string {
  const src = BUHO_BY_CODE.get(code.toUpperCase())
  return src ? `${src.heads[1]} ↔ ${src.heads[0]}` : ""
}

/** Frecuencia en minutos [mínima, máxima]: noches de viernes y sábado, y resto de noches. */
export function madridBuhoFrequency(code: string): { weekend: readonly [number, number] | null; weeknight: readonly [number, number] | null } | null {
  const src = BUHO_BY_CODE.get(code.toUpperCase())
  return src ? { weekend: src.weekend, weeknight: src.weeknight } : null
}

/** Buscador del índice de búhos: cada parada (por nombre) con las líneas que paran en ella. */
export function madridBuhoSearch(): NbSearchEntry[] {
  return Array.from(stopNameIndex(), ([name, set]) => ({
    name,
    lines: Array.from(set).sort((a, b) => buhoOrder(a) - buhoOrder(b)),
  })).sort((a, b) => a.name.localeCompare(b.name, "es"))
}

/** Paradas de cada línea búho (para las tarjetas del índice). */
export function madridBuhoStopCounts(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const code of MADRID_BUHO_CODES) out[code] = buildMadridBuhoLine(code)?.stopCount ?? 0
  return out
}
