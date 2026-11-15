import { hedgedOverpass, OVERPASS_MIRRORS } from "./overpassHedged"

// Recorrer una ciudad grande por cuadrículas (lib/osmTiles.ts) pidiendo a Overpass una consulta pequeña por cuadrícula en vez de una
// enorme que se agota. Es la misma lógica que lleva el importador de locales (/api/admin/import-osm-clubs), sacada aquí para que el de
// esenciales también pueda recorrer Madrid (14/11/2026).
//
// Hasta 3 pasadas: lo que falla en una se reintenta en la siguiente, con 4 cuadrículas en paralelo. Si se acaba el presupuesto de
// tiempo (la función de Vercel da 60 s), lo que no ha dado tiempo a pedir cuenta como fallido y se repite en la próxima visita
// (importar dos veces no duplica nada: el importador salta lo que ya existe).

export type TileQuery = (query: string, totalMs: number, errors: string[]) => Promise<any[] | null>

export type TileFetchResult = { elements: any[]; ok: number; failed: number }

const defaultQuery: TileQuery = (query, totalMs, errors) =>
  hedgedOverpass({ mirrors: OVERPASS_MIRRORS, query, totalMs, staggerMs: 1500, errors })

export async function fetchTileElements(opts: {
  /** Cuadrículas como «(sur,oeste,norte,este)» (tilesOf). */
  tiles: string[]
  /** Los bloques de la consulta para una cuadrícula: p. ej. `nwr(…)["amenity"="pharmacy"];`. */
  blocksFor: (scope: string) => string[]
  errors: string[]
  /** Tiempo total del que dispone la función, en ms. Por defecto 52 s (la función tiene 60). */
  budgetMs?: number
  query?: TileQuery
  now?: () => number
}): Promise<TileFetchResult> {
  const { tiles, blocksFor, errors } = opts
  const budget = opts.budgetMs ?? 52000
  const query = opts.query ?? defaultQuery
  const now = opts.now ?? Date.now
  const startedAt = now()
  const seenIds = new Set<string>()
  const elements: any[] = []
  let pending = [...tiles]
  for (let pass = 0; pass < 3 && pending.length > 0; pass++) {
    const stillFailing: string[] = []
    for (let i = 0; i < pending.length; i += 4) {
      const batch = pending.slice(i, i + 4)
      if (now() - startedAt > budget - 9000) { stillFailing.push(...batch); continue }
      const results = await Promise.all(batch.map(async (bb) => {
        const q = `[out:json][timeout:15][maxsize:67108864];\n(\n  ${blocksFor(bb).join("\n  ")}\n);\nout center tags;`
        return { bb, els: await query(q, 12000, errors) }
      }))
      for (const r of results) {
        if (r.els === null) { stillFailing.push(r.bb); continue }
        for (const el of r.els) {
          const id = `${el.type}${el.id}`
          if (seenIds.has(id)) continue
          seenIds.add(id)
          elements.push(el)
        }
      }
    }
    pending = stillFailing
  }
  return { elements, ok: tiles.length - pending.length, failed: pending.length }
}
