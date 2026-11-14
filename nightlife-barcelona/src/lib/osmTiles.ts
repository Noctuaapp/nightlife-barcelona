// Cuadrículas con las que el importador de OpenStreetMap recorre una ciudad grande (el 14/11/2026 se sacaron de la ruta
// /api/admin/import-osm-clubs para poder añadir Madrid sin tocar cómo se importa Barcelona).
//
// Una ciudad entera en una sola consulta a Overpass se agota, así que se trocea en cuadrículas pequeñas y cada visita a
// la herramienta hace un grupo (unas 8-12). Una ciudad que no cabe en una visita se reparte en «partes», cada una con su
// propia entrada en TILE_AREAS (madrid1, madrid2…): se lanzan una tras otra y no se duplica nada.

export type TileArea = {
  south: number
  north: number
  west: number
  east: number
  rows: number
  cols: number
  /** Filas de la cuadrícula que cubre esta parte: de rowFrom (incluida) a rowTo (excluida). Sin esto, todas. */
  rowFrom?: number
  rowTo?: number
}

export const TILE_AREAS: Record<string, TileArea> = {
  // Barcelona: 12 cuadrículas (4 x 3), igual que antes de sacarlas de la ruta.
  barcelona: { south: 41.315, north: 41.47, west: 2.05, east: 2.232, rows: 3, cols: 4 },
  // Madrid, interior de la M-30 y alrededores (14/11/2026). 4 x 4 cuadrículas de unos 4,4 x 4,2 km, repartidas en dos
  // partes de 8: sur (filas 0-1, hasta Sol y Atocha) y norte (filas 2-3, Chueca, Malasaña, Chamartín, Tetuán).
  // El rectángulo apenas toca otros municipios, así que lo que cae dentro es casi todo Madrid capital.
  madrid1: { south: 40.34, north: 40.5, west: -3.8, east: -3.6, rows: 4, cols: 4, rowFrom: 0, rowTo: 2 },
  madrid2: { south: 40.34, north: 40.5, west: -3.8, east: -3.6, rows: 4, cols: 4, rowFrom: 2, rowTo: 4 },
}

// Áreas que solo existen por cuadrículas: no tienen contorno guardado ni se usan para los servicios esenciales (esas
// herramientas siguen usando solo AREAS, que es solo Cataluña). city = municipio por defecto del local si OSM no lo dice.
export const TILE_ONLY_AREAS: Record<string, { osmPattern: string; city: string }> = {
  madrid1: { osmPattern: "Madrid", city: "Madrid" },
  madrid2: { osmPattern: "Madrid", city: "Madrid" },
}

/** Cuadrículas de un área como «(sur,oeste,norte,este)», el formato que pide Overpass. */
export function tilesOf(area: TileArea): string[] {
  const { south: S, north: N, west: W, east: E, rows, cols } = area
  const from = area.rowFrom ?? 0
  const to = area.rowTo ?? rows
  const tiles: string[] = []
  for (let r = from; r < to; r++) {
    for (let c = 0; c < cols; c++) {
      const s0 = S + ((N - S) * r) / rows
      const n0 = S + ((N - S) * (r + 1)) / rows
      const w0 = W + ((E - W) * c) / cols
      const e0 = W + ((E - W) * (c + 1)) / cols
      tiles.push(`(${s0.toFixed(5)},${w0.toFixed(5)},${n0.toFixed(5)},${e0.toFixed(5)})`)
    }
  }
  return tiles
}
