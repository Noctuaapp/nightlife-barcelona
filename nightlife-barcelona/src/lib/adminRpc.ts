import type { CityKey } from "./cities"

// Llamadas a las funciones de analítica del admin por ciudad (15/11/2026).
//
// Cada función admin_* de analítica tiene un parámetro opcional p_city (supabase/104_analitica_por_ciudad.sql). Hasta que se
// ejecute ese SQL, Supabase no la conoce con ese parámetro y responde «función no encontrada». Entonces:
//   · Barcelona vuelve a llamar sin p_city (lo de siempre: toda la web, que hoy es Barcelona porque Madrid aún no tiene visitas);
//   · Madrid NO enseña nada de Barcelona: devuelve un error claro que dice qué SQL falta. Así nunca se ven números de una ciudad
//     creyendo que son de la otra.

/** Código del error que se devuelve en Madrid cuando falta el SQL. */
export const CITY_SQL_MISSING = "city_sql_missing"

type RpcError = { message?: string; code?: string } | null
type RpcResult = { data: unknown; error: RpcError }
type RpcClient = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> }

/** ¿Es el error de «esta función (con estos parámetros) no existe»? */
export function isMissingFunction(error: RpcError | undefined): boolean {
  if (!error) return false
  const msg = String(error.message || "")
  return error.code === "PGRST202" || (/could not find the function|schema cache|does not exist/i.test(msg) && /function/i.test(msg))
}

/**
 * Llama a una función admin_* de analítica para una ciudad. `sqlFile` es el SQL que hace falta ejecutar (para el aviso).
 * El resultado lleva `cityReady: false` cuando se ha tenido que usar la versión antigua (solo en Barcelona).
 */
export async function rpcByCity<T = unknown>(
  client: RpcClient,
  fn: string,
  args: Record<string, unknown>,
  city: CityKey,
  sqlFile = "104_analitica_por_ciudad.sql"
): Promise<{ data: T | null; error: RpcError; cityReady: boolean }> {
  const res = await client.rpc(fn, { ...args, p_city: city })
  if (!res.error) return { data: res.data as T, error: null, cityReady: true }
  if (!isMissingFunction(res.error)) return { data: null, error: res.error, cityReady: true }
  if (city === "barcelona") {
    const legacy = await client.rpc(fn, args)
    return { data: (legacy.data as T) ?? null, error: legacy.error, cityReady: false }
  }
  return {
    data: null,
    error: { code: CITY_SQL_MISSING, message: `Falta ejecutar supabase/${sqlFile} en Supabase para ver esto por ciudad.` },
    cityReady: false,
  }
}

/** ¿Es este el error de «falta el SQL» de Madrid? */
export function isCitySqlMissing(error: RpcError | undefined): boolean {
  return !!error && error.code === CITY_SQL_MISSING
}

/** Lo que devuelve rpcByCity, sin los datos. */
export type RpcOutcome = { error: RpcError; cityReady: boolean }

/** Qué SQL faltan según las respuestas de una pantalla. «104» y «105» son los SQL de analítica por ciudad. */
export type CityFlags = {
  /** Madrid: falta el SQL 104 y no se enseña nada de eso. */
  m104: boolean
  /** Madrid: falta el SQL 105 y no se enseña nada de eso. */
  m105: boolean
  /** Barcelona: falta el SQL 104 y lo que se ve es toda la web junta. */
  l104: boolean
  /** Barcelona: falta el SQL 105 y lo que se ve es toda la web junta. */
  l105: boolean
}

export const NO_CITY_FLAGS: CityFlags = { m104: false, m105: false, l104: false, l105: false }

/** Resume qué SQL faltan: `r104` son las respuestas de las funciones del SQL 104 y `r105` las del 105. */
export function cityFlags(r104: RpcOutcome[], r105: RpcOutcome[]): CityFlags {
  const missing = (rs: RpcOutcome[]) => rs.some((r) => isCitySqlMissing(r.error))
  const legacy = (rs: RpcOutcome[]) => rs.some((r) => !r.cityReady && !isCitySqlMissing(r.error))
  return { m104: missing(r104), m105: missing(r105), l104: legacy(r104), l105: legacy(r105) }
}

/** Une los avisos de varias cargas de la misma pantalla. */
export function mergeCityFlags(...all: CityFlags[]): CityFlags {
  return {
    m104: all.some((f) => f.m104),
    m105: all.some((f) => f.m105),
    l104: all.some((f) => f.l104),
    l105: all.some((f) => f.l105),
  }
}

const SQL_NAMES = { 104: "104_analitica_por_ciudad.sql", 105: "105_datos_por_ciudad.sql" } as const

/**
 * Texto del aviso de la pantalla Datos (o null si no hay nada que avisar). En Madrid se dice que no se enseñan cifras hasta
 * ejecutar el SQL; en Barcelona, que se ve toda la web junta.
 */
export function cityFlagsNote(f: CityFlags): { kind: "madrid" | "barcelona"; text: string } | null {
  const files = (a: boolean, b: boolean) => [a ? SQL_NAMES[104] : null, b ? SQL_NAMES[105] : null].filter(Boolean).map((n) => `supabase/${n}`).join(" y ")
  if (f.m104 || f.m105) {
    return {
      kind: "madrid",
      text: `Falta ejecutar ${files(f.m104, f.m105)} en Supabase. Hasta entonces estas cifras no se enseñan en Madrid, para no mezclarlas con las de Barcelona.`,
    }
  }
  if (f.l104 || f.l105) {
    return {
      kind: "barcelona",
      text: `Se muestra toda la web junta: falta ejecutar ${files(f.l104, f.l105)} en Supabase para separar Barcelona y Madrid.`,
    }
  }
  return null
}
