import { supabase } from "./supabase"

// Top 3 de Noctua (25/10/2026): hasta tres clubs que recomendáis vosotros para una noche o una
// semana. Ver supabase/33_top3_recomendados.sql y /admin/recomendados.

export type PickPeriod = "night" | "week"

export type PickClub = {
  id: number
  name: string
  slug: string | null
  image: string | null
  neighborhood: string | null
  music: string | null
}

export type Pick = { rank: number; note: string | null; club: PickClub }
export type ActivePicks = { period: PickPeriod; picks: Pick[] }

// "Noche" de Barcelona: hasta las 06:00 sigue siendo la noche del día anterior (un sábado a las
// 3 de la mañana todavía es "el sábado").
export function nightDate(now = new Date()): string {
  const shifted = new Date(now.getTime() - 6 * 60 * 60 * 1000)
  return shifted.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
}

// Lunes y domingo de la semana de una fecha (YYYY-MM-DD).
export function weekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // lunes = 0
  const start = new Date(d.getTime() - dow * 86400000)
  const end = new Date(start.getTime() + 6 * 86400000)
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

type Row = { rank: number; note: string | null; period: PickPeriod; club: (PickClub & { hidden?: boolean }) | null }

// Los recomendados que tocan ahora: los de esta noche si hay; si no, los de la semana. null si no
// hay ninguno (la portada entonces no enseña nada) o si la tabla aún no existe.
export async function getActivePicks(): Promise<ActivePicks | null> {
  const today = nightDate()
  const { data, error } = await supabase
    .from("noctua_picks")
    .select("rank, note, period, club:clubs(id, name, slug, image, neighborhood, music, hidden)")
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("rank", { ascending: true })
  if (error || !data) return null
  const rows = (data as unknown as Row[]).filter((r) => r.club && !r.club.hidden)
  for (const period of ["night", "week"] as const) {
    const list = rows.filter((r) => r.period === period)
    if (list.length > 0) {
      // Un club por puesto (si alguien guardó dos en el mismo puesto, gana el primero).
      const seen = new Set<number>()
      const picks: Pick[] = []
      for (const r of list) {
        if (seen.has(r.rank) || picks.length >= 3) continue
        seen.add(r.rank)
        const { hidden: _hidden, ...club } = r.club!
        void _hidden
        picks.push({ rank: r.rank, note: r.note, club })
      }
      return { period, picks }
    }
  }
  return null
}
