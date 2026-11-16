import type { NitbusMapStop } from "../components/nitbus/NitbusStopsMap"

// Datos del mapa de los búhos de Madrid (16/11/2026): las paradas con las líneas que paran en cada una y los códigos de línea en
// orden (N1…N32, NC1, NC2). Salen de lib/madridBuhos.ts (GTFS de la EMT). Ese módulo pesa ~110 KB, así que se carga bajo demanda
// (import dinámico) y solo desde la página del mapa.

export type BuhoMapData = { stops: NitbusMapStop[]; codes: string[] }

/** N1 < N2 < … < N32 < NC1 < NC2. */
export const buhoLineNumber = (code: string) => Number(code.replace(/\D/g, "")) + (code.startsWith("NC") ? 1000 : 0)
export const byBuhoLine = (a: string, b: string) => buhoLineNumber(a) - buhoLineNumber(b)

export async function loadBuhoMapData(): Promise<BuhoMapData> {
  const { BUHO_STOPS, BUHO_LINES } = await import("./madridBuhos")
  const linesOf = new Map<number, Set<string>>()
  for (const line of BUHO_LINES) {
    for (const dir of line.stops) {
      for (const i of dir) {
        const set = linesOf.get(i) ?? new Set<string>()
        set.add(line.code)
        linesOf.set(i, set)
      }
    }
  }
  const stops: NitbusMapStop[] = []
  for (const [i, set] of linesOf) {
    const s = BUHO_STOPS[i]
    stops.push({ id: i, name: s[1], lat: s[2], lon: s[3], lines: [...set].sort(byBuhoLine) })
  }
  return { stops, codes: BUHO_LINES.map((l) => l.code).sort(byBuhoLine) }
}
