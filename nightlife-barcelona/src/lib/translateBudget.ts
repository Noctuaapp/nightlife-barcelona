// Tope diario de llamadas de pago al modelo de traducción (13/11/2026).
//
// POR QUÉ: /api/translate es público (lo usa la web de cualquier visitante). Ya está limitado a una lista cerrada
// de «tabla + id + campo» y cada texto se traduce una sola vez, pero una respuesta fallida del modelo no se guarda
// en caché, así que alguien que repita la petición podría hacer pagar la misma traducción muchas veces. Este tope
// cuenta, por día (UTC), las llamadas reales al modelo y, al llegar al límite, ya no se hace ninguna más: la web
// sigue enseñando el texto original en español y lo ya traducido se sigue leyendo de la caché.
//
// El contador vive en la base de datos (supabase/100_tope_traducciones.sql), no en memoria: en Vercel cada petición
// puede caer en una instancia distinta, y un contador en memoria no pararía nada. La función SQL suma y comprueba
// en un solo paso, así que dos peticiones a la vez no se saltan el tope.
//
// Se ajusta sin tocar código con la variable TRANSLATE_DAILY_LIMIT en Vercel (0 = no traducir nada; sirve de
// interruptor de emergencia). Si el contador falla (la tabla aún no existe, por ejemplo), NO se llama al modelo:
// ante la duda, no se gasta.

export const DEFAULT_TRANSLATE_DAILY_LIMIT = 200

export function translateDailyLimit(raw: string | undefined = process.env.TRANSLATE_DAILY_LIMIT): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_TRANSLATE_DAILY_LIMIT
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : DEFAULT_TRANSLATE_DAILY_LIMIT
}

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>
}

/** Pide permiso para UNA llamada al modelo. true = adelante; false = tope alcanzado o contador no disponible. */
export async function takeTranslateCall(db: RpcClient, limit: number = translateDailyLimit()): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("translate_take_call", { p_limit: limit })
    return !error && data === true
  } catch {
    return false
  }
}
