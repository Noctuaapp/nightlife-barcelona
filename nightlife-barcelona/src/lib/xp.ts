import { SupabaseClient } from "@supabase/supabase-js"

// Sistema de niveles de Noctua — v1: solo XP y niveles visibles, sin descuentos reales todavía.
// Los umbrales son fáciles de ajustar más adelante si hace falta recalibrarlos.
export const LEVELS = [
  { key: "bronce", name: "Bronce", min: 0, icon: "🥉", color: "#c98a4b" },
  { key: "plata", name: "Plata", min: 100, icon: "🥈", color: "#b8c0cc" },
  { key: "oro", name: "Oro", min: 300, icon: "🥇", color: "#f5c542" },
  { key: "elite", name: "Élite", min: 700, icon: "👑", color: "#a855f7" },
] as const

export type LevelInfo = {
  key: string
  name: string
  icon: string
  color: string
  xp: number
  next: (typeof LEVELS)[number] | null
  xpToNext: number | null
  progressPct: number
}

export function getLevelInfo(xp: number): LevelInfo {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.min) current = l
  }
  const idx = LEVELS.indexOf(current)
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null
  const xpToNext = next ? next.min - xp : null
  const progressPct = next
    ? Math.max(0, Math.min(100, ((xp - current.min) / (next.min - current.min)) * 100))
    : 100

  return { key: current.key, name: current.name, icon: current.icon, color: current.color, xp, next, xpToNext, progressPct }
}

// Cantidades de XP por acción. Centralizado aquí para no tener números mágicos repartidos por
// distintos componentes.
export const XP_AMOUNTS = {
  attendance: 10, // marcar "Asistiré esta noche"
  checkin: 25, // check-in geolocalizado en el club
  streak: 20, // racha semanal (>=3 días distintos de actividad en los últimos 7 días)
}

// Llama a la función de Postgres award_xp(), que inserta la fila en xp_events (con protección
// de duplicados vía índice único) y solo si es la primera vez suma el XP a profiles.xp.
// Devuelve awarded:true si esta llamada concretó una subida de XP nueva (útil para mostrar un
// aviso tipo "+10 XP" solo cuando corresponde, no cada vez que se pulsa el botón).
export async function awardXp(
  supabase: SupabaseClient,
  params: {
    userId: string
    actionType: "attendance" | "checkin" | "streak"
    itemType?: string | null
    itemId?: number | null
    amount: number
  }
): Promise<{ awarded: boolean; error: any }> {
  const { data, error } = await supabase.rpc("award_xp", {
    p_user_id: params.userId,
    p_action_type: params.actionType,
    p_item_type: params.itemType ?? null,
    p_item_id: params.itemId ?? null,
    p_amount: params.amount,
  })

  if (error) {
    console.log("AWARD XP ERROR:", error)
    return { awarded: false, error }
  }

  return { awarded: !!data, error: null }
}

// Semana ISO actual en formato "2026-W39", para comparar contra profiles.streak_week y no dar
// la recompensa semanal más de una vez por semana.
export function currentIsoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}
