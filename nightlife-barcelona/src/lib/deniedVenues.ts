import { supabase } from "./supabase"

// Locales donde a este usuario no le dejaron entrar ("¿No te dejan entrar?"). La web deja de
// recomendárselos PARA SIEMPRE (Sorpréndeme, locales cercanos) hasta que él mismo pulse
// "Volver a mostrarlo" en su perfil (25/10/2026). Solo con sesión; cada uno solo lee los suyos
// (supabase/35 y 36). Se guarda en memoria durante la visita.
let cache: { uid: string; ids: Set<number> } | null = null

export type DeniedVenue = { venueType: string; venueId: number; name: string; lastAt: string; times: number }

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// Avisos vigentes del usuario (sin los que ya pidió volver a ver). Si la columna restored_at aún
// no existe (SQL 36 sin ejecutar), se leen todos.
async function activeRows(uid: string) {
  const base = () => supabase.from("entry_denials").select("venue_type, venue_id, venue_name, created_at").eq("user_id", uid)
  const res = await base().is("restored_at", null)
  if (!res.error) return res.data || []
  const fallback = await base()
  return fallback.error ? [] : fallback.data || []
}

export async function getDeniedClubIds(): Promise<Set<number>> {
  try {
    const uid = await currentUserId()
    if (!uid) return new Set()
    if (cache && cache.uid === uid) return cache.ids
    const rows = (await activeRows(uid)) as { venue_type: string; venue_id: number }[]
    const ids = new Set(rows.filter((r) => r.venue_type === "club").map((r) => Number(r.venue_id)))
    cache = { uid, ids }
    return ids
  } catch {
    return new Set()
  }
}

// Lista para el perfil: un local por fila, con la última vez y cuántas veces.
export async function listDeniedVenues(): Promise<DeniedVenue[]> {
  try {
    const uid = await currentUserId()
    if (!uid) return []
    const rows = (await activeRows(uid)) as { venue_type: string; venue_id: number; venue_name: string; created_at: string }[]
    const map = new Map<string, DeniedVenue>()
    for (const r of rows) {
      const key = `${r.venue_type}-${r.venue_id}`
      const prev = map.get(key)
      if (!prev) map.set(key, { venueType: r.venue_type, venueId: Number(r.venue_id), name: r.venue_name, lastAt: r.created_at, times: 1 })
      else {
        prev.times += 1
        if (r.created_at > prev.lastAt) prev.lastAt = r.created_at
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  } catch {
    return []
  }
}

// "Volver a mostrarlo": deja de excluirse en las recomendaciones (el aviso no se borra).
export async function restoreDeniedVenue(venueType: string, venueId: number): Promise<boolean> {
  const { error } = await supabase.rpc("restore_denied_venue", { p_venue_type: venueType, p_venue_id: venueId })
  if (error) return false
  if (cache && venueType === "club") cache.ids.delete(Number(venueId))
  return true
}

// Al enviar un aviso nuevo, se añade al momento (sin esperar a recargar).
export function rememberDenied(clubId: number) {
  if (cache) cache.ids.add(Number(clubId))
}
