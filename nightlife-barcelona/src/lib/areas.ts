import { createSlug } from "./slug"
import type { DbRow } from "./clubQueries"

// Páginas de barrio (/barrio/[slug]) y de estilo musical (/musica/[slug]). Son las búsquedas más
// habituales ("discotecas en el Born", "discotecas de techno Barcelona") y antes no había ninguna
// URL que respondiera a ellas: todo estaba dentro del filtro de /clubs, que Google no ve.

// Por debajo de este número de locales la página existe pero no se pide indexar (contenido escaso).
export const MIN_INDEXABLE = 3

export type StyleDef = { slug: string; rx: RegExp; label: string }

// `label` es el nombre en español para el título del servidor (metadata); en pantalla se usa la
// clave de traducción areas.style.<slug>.
export const STYLES: StyleDef[] = [
  { slug: "techno", rx: /techno/i, label: "techno" },
  { slug: "house", rx: /house/i, label: "house" },
  { slug: "electronica", rx: /electr[oó]ni|electronic|\bedm\b|techno|house|minimal/i, label: "música electrónica" },
  { slug: "reggaeton", rx: /regg?a?et[oó]n|reggaet|perreo/i, label: "reggaetón" },
  { slug: "comercial", rx: /comercial|commercial|\bpop\b|top ?40|charts|hits/i, label: "música comercial" },
  { slug: "latina", rx: /latin|salsa|bachata|merengue|cumbia|kizomba/i, label: "música latina" },
  { slug: "hip-hop", rx: /hip.?hop|\brap\b|r&b|\brnb\b|trap|urban/i, label: "hip hop" },
  { slug: "rock-indie", rx: /rock|indie|alternativ|punk|britpop/i, label: "rock e indie" },
  { slug: "jazz", rx: /jazz|soul|funk|blues|swing/i, label: "jazz y soul" },
]

export function styleBySlug(slug: string): StyleDef | undefined {
  return STYLES.find((s) => s.slug === slug)
}

export function clubsForStyle(clubs: DbRow[], style: StyleDef): DbRow[] {
  return clubs.filter((c) => typeof c.music === "string" && style.rx.test(c.music))
}

export type AreaLink = { slug: string; name: string; count: number }

// Barrios presentes en los datos (la columna neighborhood ya está normalizada) con su número de locales.
export function neighborhoodsOf(clubs: DbRow[]): AreaLink[] {
  const map = new Map<string, AreaLink>()
  for (const c of clubs) {
    const name = typeof c.neighborhood === "string" ? c.neighborhood.trim() : ""
    if (!name) continue
    const slug = createSlug(name)
    if (!slug) continue
    const entry = map.get(slug)
    if (entry) entry.count += 1
    else map.set(slug, { slug, name, count: 1 })
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
}

export function stylesOf(clubs: DbRow[]): AreaLink[] {
  return STYLES.map((s) => ({ slug: s.slug, name: s.label, count: clubsForStyle(clubs, s).length })).filter((s) => s.count > 0)
}

// Orden del listado: primero los locales con ficha cuidada (verificados, con foto y valoración).
export function rankClubs(clubs: DbRow[]): DbRow[] {
  const score = (c: DbRow) =>
    (c.verified ? 3 : 0) + (c.image ? 2 : 0) + (Number(c.google_rating || c.rating) || 0) / 2 + (c.trending ? 1 : 0)
  return [...clubs].sort((a, b) => score(b) - score(a))
}
