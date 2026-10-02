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
export async function isOverBudget(supabase: SupabaseClient, limit = DEFAULT_DAILY_LIMIT): Promise<{ over: boolean; used: number }> {
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
export type GoogleCallCounter = { count: number }

export function createCounter(): GoogleCallCounter {
  return { count: 0 }
}

export async function googleFetch(counter: GoogleCallCounter, url: string, init?: RequestInit): Promise<Response> {
  counter.count++
  return fetch(url, init)
}
