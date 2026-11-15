import { distanceInMeters } from "./geo"
import { BUHO_LINES, BUHO_STOPS, type BuhoLine } from "./madridBuhos"

// Búhos (bus nocturno de la EMT de Madrid) cercanos a un sitio. Los datos son estáticos (madridBuhos.ts, GTFS de la EMT) y el módulo es
// pesado (~110 KB), así que solo se importa desde el cliente cuando hay que enseñar un local de Madrid (import() dinámico).

/** Hasta dónde se cuenta una parada como «cerca» (mismo criterio que el Nitbus de Barcelona: 700 m). */
export const BUHO_NEAR_METERS = 700
/** Cuántas líneas se enseñan como máximo en la ficha. */
export const BUHO_MAX_ROWS = 6
/** A partir de esta distancia al punto de salida de la línea (Cibeles, Alonso Martínez, Moncloa…) el local ya no es «centro». */
const CENTRAL_METERS = 4000

export type BuhoRow = {
  code: string
  /** Destino del sentido que se enseña («Sanchinarro»). */
  toward: string
  stopName: string
  lat: number
  lon: number
  distanceMeters: number
  /** Frecuencia en minutos [mínima, máxima]: noches de viernes y sábado / resto de noches. */
  weekend: readonly [number, number] | null
  weeknight: readonly [number, number] | null
}

const lineNumber = (code: string) => Number(code.replace(/\D/g, "")) + (code.startsWith("NC") ? 1000 : 0)

function nearestStop(line: BuhoLine, dir: 0 | 1, lat: number, lon: number): { i: number; d: number } {
  let best = -1
  let bestD = Infinity
  for (const i of line.stops[dir]) {
    const s = BUHO_STOPS[i]
    const d = distanceInMeters(lat, lon, s[2], s[3])
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return { i: best, d: bestD }
}

/**
 * La parada más cercana de cada línea (y sentido) a ese punto, de menor a mayor distancia.
 *
 * Qué sentido se enseña: casi todas las líneas salen de un punto del centro (Cibeles…) hacia un barrio. Si el local está en el centro (a menos de
 * 4 km de ese punto), lo que se busca es volver a casa, o sea, el sentido que se aleja del centro. Si está lejos, se enseñan los dos sentidos:
 * puede estar volviendo al centro o a su barrio. NC1 y NC2 no tienen «centro» (unen Cuatro Caminos y Atocha) y van siempre con los dos.
 */
export function nearbyBuhos(lat: number, lon: number, maxMeters = BUHO_NEAR_METERS, limit = BUHO_MAX_ROWS): BuhoRow[] {
  const rows: BuhoRow[] = []
  for (const line of BUHO_LINES) {
    let dirs: (0 | 1)[] = [0, 1]
    if (line.home !== null) {
      const hub = BUHO_STOPS[line.stops[line.home][0]]
      if (distanceInMeters(lat, lon, hub[2], hub[3]) <= CENTRAL_METERS) dirs = [line.home]
    }
    for (const dir of dirs) {
      const { i, d } = nearestStop(line, dir, lat, lon)
      if (i < 0 || d > maxMeters) continue
      const s = BUHO_STOPS[i]
      rows.push({ code: line.code, toward: line.heads[dir], stopName: s[1], lat: s[2], lon: s[3], distanceMeters: d, weekend: line.weekend, weeknight: line.weeknight })
    }
  }
  rows.sort((a, b) => a.distanceMeters - b.distanceMeters || lineNumber(a.code) - lineNumber(b.code))
  return rows.slice(0, limit)
}
