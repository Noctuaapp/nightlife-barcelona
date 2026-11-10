import type { DbRow } from "../clubQueries"
import { MIN_INDEXABLE, neighborhoodsOf, type AreaLink } from "../areas"
import { zoneOf } from "../zones"
import { zoneSlugByName } from "../zonePages"

/** Barrios de Barcelona con locales suficientes para tener página (los municipios de fuera tienen su /zona en español). */
export function englishAreas(clubs: DbRow[]): AreaLink[] {
  return neighborhoodsOf(clubs).filter((n) => n.count >= MIN_INDEXABLE && !zoneSlugByName(zoneOf({ neighborhood: n.name })))
}
