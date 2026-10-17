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
    // Si este usuario llegó invitado y ya hizo su primer check-in, se liquida el premio de invitación.
    try { await supabase.rpc("settle_my_referral") } catch {}
    const { data, error } = await supabase.rpc("evaluate_badges")
    if (error || !Array.isArray(data)) return []
    return data as string[]
  } catch {
    return []
  }
}

// Bolsa de retos semanales: cada semana se activan 3 de estos 6, rotando (ver activeChallenges),
// así no son siempre los mismos. award_xp en Postgres valida cada uno de verdad; cuál esté
// "activo" es solo para decidir qué se muestra, cualquiera de los 6 se puede reclamar cualquier
// semana si de verdad se cumple.
export const CHALLENGE_POOL = [
  { n: 1, emoji: "🧭", title: "Rincón nuevo", desc: "Haz check-in en un local donde nunca habías estado", xp: 25 },
  { n: 2, emoji: "📝", title: "Voz de la noche", desc: "Deja una nota tras un check-in para quien venga después", xp: 15 },
  { n: 3, emoji: "📅", title: "Plan en marcha", desc: "Marca 2 planes con “Asistiré”", xp: 15 },
  { n: 4, emoji: "🧭", title: "Barrio nuevo", desc: "Haz check-in en un barrio donde no habías estado antes", xp: 20 },
  { n: 5, emoji: "👍", title: "Vecino de la noche", desc: "Valora la nota de check-in de alguien", xp: 10 },
  { n: 6, emoji: "🔥", title: "Doble noche", desc: "Haz check-in en 2 noches distintas esta semana", xp: 20 },
] as const

// Retrocompatible: código viejo que esperaba los 3 fijos de siempre.
export const CHALLENGES = CHALLENGE_POOL.slice(0, 3)

// Qué 3 retos de la bolsa están activos esta semana ISO (ej. 202642). Rota uno por semana y
// pasa por los 6 cada 6 semanas — mismos 3 para todo el mundo, nadie ve algo distinto a otro.
export function activeChallenges(weekNum: number) {
  const start = weekNum % CHALLENGE_POOL.length
  return [0, 1, 2].map((i) => CHALLENGE_POOL[(start + i) % CHALLENGE_POOL.length])
}
