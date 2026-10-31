// Cálculos de «Cuándo sale la gente» (Admin, 31/10/2026). La base de datos (supabase/63) devuelve,
// para cada medida y cada día de la semana / día del mes / mes, el TOTAL de personas y el nº de
// noches observadas. Aquí se pasa a «media por noche» (para que un martes que se ha visto 5 veces
// no pierda frente a un sábado que se ha visto 9) y se decide cuánto fiarse de cada gráfica.

export type Bucket = { k: number; total: number; nights: number }
export type AfluenciaMetric = {
  first: string | null
  total: number
  nights: number
  dow: Bucket[]
  dom: Bucket[]
  month: Bucket[]
}
export type Mode = "avg" | "total"
export type Kind = "dow" | "dom" | "month"

export type Slot = {
  k: number
  label: string // etiqueta corta del eje (Lun, 15, Ene)
  long: string // nombre completo (Lunes, Día 15, Enero)
  value: number | null // null = nunca se ha observado ese día
  total: number
  nights: number
}

export const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
export const DOW_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
export const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
export const MONTH_LONG = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export function slotsFor(kind: Kind, metric: AfluenciaMetric | null | undefined, mode: Mode): Slot[] {
  const buckets = new Map<number, Bucket>()
  for (const b of metric?.[kind] || []) buckets.set(Number(b.k), { k: Number(b.k), total: Number(b.total) || 0, nights: Number(b.nights) || 0 })
  const keys = kind === "dow" ? [1, 2, 3, 4, 5, 6, 7] : kind === "month" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : Array.from({ length: 31 }, (_, i) => i + 1)
  return keys.map((k) => {
    const b = buckets.get(k)
    const nights = b?.nights || 0
    const total = b?.total || 0
    const label = kind === "dow" ? DOW_SHORT[k - 1] : kind === "month" ? MONTH_SHORT[k - 1] : String(k)
    const long = kind === "dow" ? DOW_LONG[k - 1] : kind === "month" ? MONTH_LONG[k - 1] : `Día ${k}`
    const value = nights === 0 ? null : mode === "avg" ? total / nights : total
    return { k, label, long, value, total, nights }
  })
}

// El que más y el que menos, solo entre los observados. null si no hay de qué comparar (menos de dos,
// todo cero o todos iguales): mejor no decir nada que inventar un «ganador».
export function extremes(slots: Slot[]): { max: Slot; min: Slot } | null {
  const seen = slots.filter((s) => s.value !== null)
  if (seen.length < 2) return null
  let max = seen[0]
  let min = seen[0]
  for (const s of seen) {
    if ((s.value as number) > (max.value as number)) max = s
    if ((s.value as number) < (min.value as number)) min = s
  }
  if ((max.value as number) <= 0 || max.value === min.value) return null
  return { max, min }
}

export type Reliability = "none" | "low" | "mid" | "ok"

// Cuánto fiarse de una gráfica según cuántas veces se ha visto cada día:
//   · día de la semana: cada uno debería haberse visto 8+ veces (2 meses) para ser orientativo; 16+ para fiable;
//   · día del mes: cada día se ve una vez al mes, así que 3+ meses es orientativo y 6+ fiable;
//   · mes: hace falta casi un año para tener todos los meses y, aun así, Noctua crece, así que lo
//     reciente pesa más; hasta 18 meses de datos se queda en «orientativo».
export function reliability(kind: Kind, metric: AfluenciaMetric | null | undefined): Reliability {
  if (!metric || !metric.total || !metric.nights) return "none"
  if (kind === "month") return metric.nights < 180 ? "low" : metric.nights < 540 ? "mid" : "ok"
  const counts = (metric[kind] || []).map((b) => Number(b.nights) || 0).filter((n) => n > 0)
  if (counts.length === 0) return "none"
  if (kind === "dow") {
    const m = Math.min(...counts)
    return m < 8 ? "low" : m < 16 ? "mid" : "ok"
  }
  const m = Math.max(...counts)
  return m < 3 ? "low" : m < 6 ? "mid" : "ok"
}

export function fmtNum(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return "—"
  return n.toLocaleString("es-ES", { maximumFractionDigits: digits })
}

// Techo «redondo» para el eje: 1, 2, 5, 10, 20, 50… (así las líneas de la cuadrícula quedan en números limpios).
export function niceMax(v: number): number {
  if (!(v > 0)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / p
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return step * p
}
