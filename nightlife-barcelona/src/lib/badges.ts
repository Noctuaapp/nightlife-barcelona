import { SupabaseClient } from "@supabase/supabase-js"

// Insignias de EXPLORACIÓN: premian descubrir sitios, barrios y estilos distintos, y aportar
// información útil. A propósito no hay ninguna por cantidad de copas, por salir muchas noches
// seguidas ni por quedarse hasta tarde.
export const BADGES: Record<string, { emoji: string; name: string; hint: string; xp: number }> = {
  first_step: { emoji: "🌙", name: "Primera noche", hint: "Haz tu primer check-in", xp: 10 },
  explorer_3: { emoji: "🧭", name: "Explorador", hint: "Check-in en 3 locales distintos", xp: 20 },
  explorer_10: { emoji: "🗺️", name: "Cartógrafo", hint: "Check-in en 10 locales distintos", xp: 50 },
  hoods_3: { emoji: "🏘️", name: "Trotabarrios", hint: "Sal en 3 barrios distintos", xp: 30 },
  sound_3: { emoji: "🎧", name: "Oído abierto", hint: "Prueba 3 estilos de música distintos", xp: 30 },
  voice: { emoji: "📝", name: "Voz de la noche", hint: "Deja una nota tras un check-in", xp: 15 },
  planner: { emoji: "📅", name: "Planificador", hint: "Marca 3 planes con “Asistiré”", xp: 15 },
}

// Pide a la base de datos que revise qué insignias te corresponden. Devuelve solo las NUEVAS
// (las que se acaban de desbloquear). Si falla o no hay sesión, devuelve [] sin molestar.
export async function evaluateBadges(supabase: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc("evaluate_badges")
    if (error || !Array.isArray(data)) return []
    return data as string[]
  } catch {
    return []
  }
}

// Retos semanales (se renuevan cada lunes). Cada uno da XP una sola vez por semana.
export const CHALLENGES = [
  { n: 1, emoji: "🧭", title: "Rincón nuevo", desc: "Haz check-in en un local donde nunca habías estado", xp: 25 },
  { n: 2, emoji: "📝", title: "Voz de la noche", desc: "Deja una nota tras un check-in para quien venga después", xp: 15 },
  { n: 3, emoji: "📅", title: "Plan en marcha", desc: "Marca 2 planes con “Asistiré”", xp: 15 },
] as const
