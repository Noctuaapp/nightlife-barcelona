import { createSlug } from "./slug"

// Encuentra un local por la parte final de su URL entre los de una ciudad en vista previa (14/11/2026).
// Mismo criterio que lib/slugLookup.ts: primero la columna slug, luego el nombre pasado a slug. Los locales
// importados de OpenStreetMap no traen slug, así que casi siempre se encuentran por el nombre.

type Row = { id: number; name?: string | null; slug?: string | null }

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function matchPreviewClub<T extends Row>(rows: T[], rawSlug: string): T | null {
  const requested = safeDecode(rawSlug).toLowerCase()
  if (!requested) return null
  const normalized = createSlug(requested)
  return (
    rows.find((r) => (r.slug || "").toLowerCase() === requested) ??
    rows.find((r) => createSlug(r.name) === requested) ??
    (normalized ? rows.find((r) => createSlug(r.name) === normalized) : undefined) ??
    null
  )
}
