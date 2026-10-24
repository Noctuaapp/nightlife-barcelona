import { SupabaseClient } from "@supabase/supabase-js"
import { logError } from "./log"

// Sistema de niveles de Noctua — v2 (auditoría de octubre 2026): subir de nivel exige XP *y*
// tiempo mínimo desde el nivel anterior (LEVEL_GATE_DAYS), no solo acumular XP. Así un fin de
// semana muy movido de salidas no vale, por sí solo, varias semanas de progresión normal — el
// calendario frena lo que el XP por sí solo no puede frenar. El tiempo real transcurrido vive en
// profiles.level_key/level_since (actualizado por la función de Postgres recompute_level) y es
// la fuente de verdad del nivel ACTUAL; getLevelInfo(xp) de aquí abajo solo calcula a qué nivel
// *alcanzaría* el XP si no hubiera gate de tiempo — útil para mostrar "ya tienes el XP, falta
// esperar hasta el [fecha]" cuando los dos no coinciden. Ver supabase/9_niveles_y_moderacion.sql.
// "perks" es texto descriptivo para la página de Club Noctua.
export const LEVELS = [
  { key: "bronce", name: "Bronce", min: 0, icon: "🥉", color: "#c98a4b", perkKey: "bronce" },
  { key: "plata", name: "Plata", min: 300, icon: "🥈", color: "#b8c0cc", perkKey: "plata" },
  { key: "oro", name: "Oro", min: 800, icon: "🥇", color: "#f5c542", perkKey: "oro" },
  { key: "platino", name: "Platino", min: 1800, icon: "🔷", color: "#7dd3fc", perkKey: "platino" },
  { key: "zafiro", name: "Zafiro", min: 3500, icon: "🔵", color: "#3b82f6", perkKey: "zafiro" },
  { key: "diamante", name: "Diamante", min: 6000, icon: "💎", color: "#67e8f9", perkKey: "diamante" },
  { key: "elite", name: "Élite", min: 10000, icon: "👑", color: "#dc2626", perkKey: "elite" },
] as const

// Días mínimos desde que se alcanzó el nivel anterior para poder pasar a este. Debe coincidir
// exactamente con la tabla de días que usa recompute_level() en Postgres (9_niveles_y_moderacion.sql)
// — si se cambia aquí, hay que cambiarlo también ahí.
export const LEVEL_GATE_DAYS: Record<string, number> = {
  plata: 45,
  oro: 40,
  platino: 60,
  zafiro: 90,
  diamante: 120,
  elite: 180,
}

export function levelByKey(key: string): (typeof LEVELS)[number] {
  return LEVELS.find((l) => l.key === key) || LEVELS[0]
}

export type LevelStatus = {
  current: (typeof LEVELS)[number]
  next: (typeof LEVELS)[number] | null
  xpToNext: number | null
  progressPct: number
  // Fecha en la que se desbloquea el siguiente nivel SOLO cuando ya hay XP de sobra y lo único
  // que falta es tiempo (profiles.level_since + LEVEL_GATE_DAYS); null si falta XP, o si no se
  // conoce levelSince (p. ej. porque supabase/9_niveles_y_moderacion.sql aún no se ha ejecutado).
  unlocksAt: Date | null
}

// Nivel "de verdad" de alguien, combinando su nivel efectivo guardado en el servidor
// (profiles.level_key/level_since, gateado por tiempo) con su XP. Si levelKey es null —porque la
// migración de niveles aún no se ha ejecutado o la columna no se pudo leer— se comporta exactamente
// como el getLevelInfo(xp) de siempre, sin gate de tiempo, para no romper nada mientras tanto.
export function getLevelStatus(xp: number, levelKey: string | null, levelSince: string | null): LevelStatus {
  const current = levelKey ? levelByKey(levelKey) : levelByKey(getLevelInfo(xp).key)
  const idx = LEVELS.indexOf(current)
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null
  const xpToNext = next ? Math.max(0, next.min - xp) : null
  const progressPct = next
    ? Math.max(0, Math.min(100, ((xp - current.min) / (next.min - current.min)) * 100))
    : 100

  let unlocksAt: Date | null = null
  if (next && levelSince && xp >= next.min) {
    const requiredDays = LEVEL_GATE_DAYS[next.key] || 0
    const unlock = new Date(new Date(levelSince).getTime() + requiredDays * 86400000)
    if (unlock.getTime() > Date.now()) unlocksAt = unlock
  }

  return { current, next, xpToNext, progressPct, unlocksAt }
}

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
  let current: (typeof LEVELS)[number] = LEVELS[0]
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
// distintos componentes. Rebalanceado en la auditoría de octubre 2026: antes la racha semanal
// (solo abrir la app 3 días, sin salir de casa) pagaba el doble que un check-in real y verificado
// por GPS — justo al revés de lo que tiene sentido. Ahora lo presencial y verificado es lo que
// más paga, y lo pasivo (abrir la app) paga poco: el freno real al farmeo en ráfaga lo pone el
// gate de tiempo de LEVEL_GATE_DAYS, no estos importes.
export const XP_AMOUNTS = {
  checkin: 5, // check-in geolocalizado en el club (bajado de 20 a 5 el 24/10/2026; ver supabase/27_checkin_5xp.sql)
  streak: 15, // racha semanal (>=3 días distintos de actividad en los últimos 7 días)
  dailyLogin: 2, // entrar en la app un día más seguido del anterior (racha diaria de inicios de sesión)
}

// Llama a la función de Postgres award_xp(), que inserta la fila en xp_events (con protección
// de duplicados vía índice único) y solo si es la primera vez suma el XP a profiles.xp.
// Devuelve awarded:true si esta llamada concretó una subida de XP nueva (útil para mostrar un
// aviso tipo "+10 XP" solo cuando corresponde, no cada vez que se pulsa el botón).
export async function awardXp(
  supabase: SupabaseClient,
  params: {
    userId: string
    actionType: "checkin" | "streak" | "badge" | "challenge" | "daily_login"
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
    logError("AWARD XP ERROR:", error)
    return { awarded: false, error }
  }

  return { awarded: !!data, error: null }
}

// Comprueba si el XP y el tiempo transcurrido ya alcanzan para subir de nivel, y si es así lo
// aplica (llama a recompute_level() en Postgres, que mueve profiles.level_key/level_since).
// Devuelve el nuevo nivel solo cuando de verdad ha cambiado, para disparar la celebración.
// Falla en silencio si la función aún no existe en la base de datos (antes de ejecutar
// supabase/9_niveles_y_moderacion.sql), igual que hace do_checkin con su respaldo.
export async function checkLevelUp(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("recompute_level", { p_user_id: userId })
    if (error || !data) return null
    const result = data as { leveled_up?: boolean; new_level?: string }
    return result.leveled_up && result.new_level ? result.new_level : null
  } catch {
    return null
  }
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

// Fecha de hoy ("2026-10-17") en hora de Madrid, no la del dispositivo — para que la racha diaria
// de inicios de sesión cuente los días igual para todo el mundo, sea cual sea su zona horaria.
export function madridDateStr(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

// Día anterior a una fecha "YYYY-MM-DD" (en el mismo formato), para saber si la racha diaria
// sigue (el último inicio de sesión fue ayer) o se rompe (fue antes de ayer, o nunca).
export function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
