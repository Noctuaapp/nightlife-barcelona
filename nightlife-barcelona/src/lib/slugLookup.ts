import { supabase } from "./supabase"
import { createSlug } from "./slug"
import type { DbRow } from "./clubQueries"

// Busca un club o evento por su slug (la parte final de la URL).
//
// Antes cada ficha descargaba TODOS los clubs (o eventos) completos de la base de datos para
// encontrar el suyo comparando nombres: con 250+ locales eran cientos de KB por visita. Ahora:
//   1) Se busca en la columna `slug` (indexada): una sola fila, inmediato.
//   2) Si no está (club renombrado, enlace antiguo con símbolos como "dr.-stravinsky", o la
//      columna aún no existe), se compara con los nombres pidiendo solo id + nombre, que es ligero.
// `exact` dice si la URL pedida ya es la buena; si no, la ficha redirige (301) a la canónica, así
// Google consolida una sola URL por local en vez de verlas como páginas distintas o soft 404.

type Kind = "club" | "event"

const CONFIG = {
  club: { table: "clubs", nameField: "name" },
  event: { table: "events", nameField: "title" },
} as const

export type SlugMatch = { row: DbRow; canonicalSlug: string; exact: boolean }

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function findBySlug(kind: Kind, rawSlug: string): Promise<SlugMatch | null> {
  const { table, nameField } = CONFIG[kind]
  const requested = safeDecode(rawSlug).toLowerCase()

  // 1) Columna slug
  const { data: direct } = await supabase
    .from(table)
    .select("*")
    .eq("slug", requested)
    .eq("hidden", false)
    .limit(1)
    .maybeSingle()
  if (direct) return { row: direct, canonicalSlug: direct.slug, exact: true }

  // 2) Respaldo por nombre (solo columnas ligeras)
  const normalized = createSlug(requested)
  if (!normalized) return null

  // 1b) Club repetido que se ocultó (SQL 28): su URL vieja ya estaba en Google. En vez de un 404,
  //     301 a la ficha que se ha quedado, así Google pasa esa URL a la buena.
  if (kind === "club") {
    const { data: dups, error: dupErr } = await supabase
      .from("clubs")
      .select("name, slug, duplicate_of")
      .eq("hidden", true)
      .not("duplicate_of", "is", null)
    if (!dupErr && dups) {
      const dup = (dups as DbRow[]).find(
        (d) => d.slug === requested || createSlug(d.name) === requested || createSlug(d.name) === normalized
      )
      if (dup) {
        const { data: keep } = await supabase.from("clubs").select("*").eq("id", dup.duplicate_of).eq("hidden", false).maybeSingle()
        if (keep) return { row: keep, canonicalSlug: keep.slug || createSlug(keep.name), exact: false }
      }
    }
  }

  const { data: list } = await supabase.from(table).select(`id, ${nameField}`).eq("hidden", false)
  const rows = (list || []) as unknown as DbRow[]
  const withSlug = rows.map((r) => ({ id: r.id as number, s: createSlug(r[nameField]) }))

  let match = withSlug.find((r) => r.s === requested) || withSlug.find((r) => r.s === normalized)
  if (!match) {
    // Enlaces antiguos más cortos que el nombre actual ("opium" → "opium-barcelona"), solo si no
    // hay ambigüedad posible.
    const prefixed = withSlug.filter((r) => r.s.startsWith(normalized + "-"))
    if (prefixed.length === 1) match = prefixed[0]
  }
  if (!match) return null

  const { data: row } = await supabase.from(table).select("*").eq("id", match.id).maybeSingle()
  if (!row) return null
  const canonicalSlug: string = row.slug || createSlug(row[nameField])
  return { row, canonicalSlug, exact: canonicalSlug === requested }
}
