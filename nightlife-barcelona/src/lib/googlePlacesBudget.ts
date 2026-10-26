import { SupabaseClient } from "@supabase/supabase-js"

// Tope diario de llamadas de pago a Google Places, compartido por los 3 crons
// (refresh-google-data, refresh-events-google-data, refresh-essentials-google-data).
// Se puede ajustar sin tocar código con la env var GOOGLE_PLACES_DAILY_LIMIT en Vercel.
// Bajado de 3000 a 20 el 2/10/2026 tras un gasto inesperado: mientras la app no esté lanzada
// y no haya presupuesto para esto, mejor pecar de corto aquí (coincide con la cuota diaria que
// se puso a mano en la consola de Google Cloud ese mismo día). Súbelo cuando quieras más margen.
export const DEFAULT_DAILY_LIMIT = 20

// Si está a "true"/"1", los crons piden también reviews y fotos a Google (el fieldmask caro,
// "Enterprise + Atmosphere", más una llamada de pago extra por cada foto descargada). Si no está
// puesta o vale cualquier otra cosa, los crons solo piden nombre/tipo/rating — el fieldmask básico,
// mucho más barato — y no descargan fotos ni guardan reseñas. Pensado para poder encender/apagar
// esto desde las env vars de Vercel sin tocar ni desplegar código.
export function fetchRichData(): boolean {
  const v = process.env.GOOGLE_PLACES_FETCH_RICH_DATA
  return v === "true" || v === "1"
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function getTodayUsage(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("api_call_budget")
    .select("calls_used")
    .eq("day", today())
    .maybeSingle()
  return data?.calls_used || 0
}

// Compueba el gasto de hoy ANTES de arrancar el cron. Si ya se pasó del límite,
// el cron no hace ninguna llamada a Google en este ciclo (lo reintenta al día siguiente).
export async function isOverBudget(supabase: SupabaseClient, limit = dailyLimit()): Promise<{ over: boolean; used: number }> {
  const used = await getTodayUsage(supabase)
  return { over: used >= limit, used }
}

// Suma al contador de hoy las llamadas reales que se han hecho a Google en este ciclo.
export async function recordGoogleCalls(supabase: SupabaseClient, n: number): Promise<void> {
  if (n <= 0) return
  await supabase.rpc("increment_daily_calls", { p_day: today(), p_n: n })
}

// Contador simple + fetch envuelto: cada llamada a googleFetch() suma 1 al contador,
// para poder registrar al final exactamente cuántas llamadas de pago se han hecho.
export type GoogleCallCounter = { count: number; max?: number }

export function createCounter(max?: number): GoogleCallCounter {
  return { count: 0, max }
}

// Si el contador tiene tope (ver startJobBudget), al llegar a él ya no se hace la llamada: se lanza
// un error que cada cron recoge como "pendiente para mañana". Así nunca se pasa del tope diario.
export async function googleFetch(counter: GoogleCallCounter, url: string, init?: RequestInit): Promise<Response> {
  if (counter.max !== undefined && counter.count >= counter.max) {
    throw new Error("Tope diario de llamadas a Google alcanzado (se sigue mañana)")
  }
  counter.count++
  return fetch(url, init)
}

// Reparto del tope diario entre las 3 tareas de cada noche (26/10/2026). Antes las tres compartían
// el mismo bote y la de clubs (la primera, a las 4:00) se lo gastaba entero —e incluso se pasaba:
// 23 de 20—, así que eventos y esenciales llevaban días sin poder actualizarse.
//   clubs 60 % · eventos 20 % · esenciales: lo que quede (al menos su 20 %).
export function dailyLimit(): number {
  const v = Number(process.env.GOOGLE_PLACES_DAILY_LIMIT)
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_DAILY_LIMIT
}

const JOB_SHARE = { clubs: 0.6, events: 0.2, essentials: 1 } as const

export async function startJobBudget(
  supabase: SupabaseClient,
  job: keyof typeof JOB_SHARE
): Promise<{ over: boolean; used: number; counter: GoogleCallCounter }> {
  const limit = dailyLimit()
  const used = await getTodayUsage(supabase)
  const left = Math.max(0, limit - used)
  const max = Math.min(left, Math.floor(limit * JOB_SHARE[job]))
  return { over: max <= 0, used, counter: createCounter(max) }
}
