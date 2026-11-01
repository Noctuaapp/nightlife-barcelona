import { createSlug } from "./slug"
import { MIN_INDEXABLE, neighborhoodsOf, type AreaLink } from "./areas"
import type { DbRow } from "./clubQueries"

// Zonas de la primera pantalla de la portada (01/11/2026). La gente busca por zona («08030», «discotecas
// en Gràcia»): en vez de obligarla a escribirlo, los barrios con más locales salen como botones y
// al pulsar uno el carrusel de «Esta noche» enseña solo esa zona. Salen de los datos (columna
// neighborhood), no de una lista fija, y solo los barrios con locales suficientes para tener
// página propia (/barrio/[slug]), que es a donde lleva «Ver todos».

export const HOME_ZONE_MAX = 8

// «Barcelona» como barrio es el valor por defecto de los locales sin barrio: no ayuda a elegir.
const GENERIC_SLUGS = new Set(["barcelona"])

export function homeZoneChips(clubs: DbRow[], max: number = HOME_ZONE_MAX): AreaLink[] {
  return neighborhoodsOf(clubs)
    .filter((z) => z.count >= MIN_INDEXABLE && !GENERIC_SLUGS.has(z.slug))
    .slice(0, max)
}

export function inZone(club: { neighborhood?: unknown }, zoneSlug: string): boolean {
  const name = typeof club.neighborhood === "string" ? club.neighborhood.trim() : ""
  return name !== "" && createSlug(name) === zoneSlug
}
