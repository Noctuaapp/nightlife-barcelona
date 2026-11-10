// Duraciones legibles para el admin (10/11/2026): «45 s», «3 min 20 s», «1 h 05 min».
// Los segundos de Admin › Datos, Visitas y Actividad vienen de supabase/84_clics_y_tiempo.sql.
export function fmtDuration(secs: number | null | undefined): string {
  if (secs === null || secs === undefined || !Number.isFinite(secs) || secs < 0) return "—"
  const total = Math.round(secs)
  if (total < 60) return `${total} s`
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`
  // Con menos de 10 minutos los segundos aún importan; a partir de ahí solo estorban.
  return m < 10 && s > 0 ? `${m} min ${s} s` : `${m} min`
}

// Segundos de «page_time» (los que la web mide con la pestaña a la vista) que hay en el recorrido de una
// visita. Null si la visita es anterior a la medición o no se quedó nada que medir.
export function measuredSeconds(events: { type: string; meta?: Record<string, unknown> | null }[] | null | undefined): number | null {
  let total = 0
  let found = false
  for (const e of events || []) {
    if (e.type !== "page_time") continue
    const n = Number(e.meta?.seconds)
    if (Number.isFinite(n) && n > 0) {
      total += Math.min(n, 1800)
      found = true
    }
  }
  return found ? total : null
}
