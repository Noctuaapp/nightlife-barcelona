// Serie de los últimos 7 días del Resumen del admin (20/11/2026).
//
// Antes la gráfica se construía con las filas que devolvía Supabase, y Supabase solo devuelve los días en que hubo algo:
// a las 00:10 del día 20 aún no había ninguna visita «de hoy», así que la gráfica terminaba en el 19 (con la etiqueta «hoy»)
// y, además, la semana anterior se emparejaba por POSICIÓN, no por fecha (si faltaba un día, todas las marcas se corrían).
// Ahora el eje son siempre los 7 días de calendario, los días sin filas valen 0 y cada día se empareja con el mismo día
// de la semana anterior.

export type SeriesPoint = { d: string; v: number; prev: number | null }

/**
 * @param days     los 7 días de la semana, de más antiguo a más reciente (el último es hoy)
 * @param prevDays los 7 días de la semana anterior, en el mismo orden (prevDays[i] es el mismo día de la semana que days[i])
 * @param hasPrev  si la semana anterior se ha cargado (si no, no se dibuja la marca)
 */
export function weekSeries<T extends { d: string }>(
  days: string[],
  prevDays: string[],
  cur: T[] | null | undefined,
  prev: T[] | null | undefined,
  hasPrev: boolean,
  pick: (row: T) => number
): SeriesPoint[] {
  const byDay = new Map<string, T>((cur || []).map((r) => [r.d, r]))
  const prevByDay = new Map<string, T>((prev || []).map((r) => [r.d, r]))
  return days.map((d, i) => {
    const row = byDay.get(d)
    const pr = prevByDay.get(prevDays[i])
    return { d, v: row ? pick(row) : 0, prev: hasPrev ? (pr ? pick(pr) : 0) : null }
  })
}
