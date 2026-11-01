// Fechas elegidas a mano en el admin (01/11/2026). Visitas solo tenía «Hoy / 7 días / 30 días»; ahora
// también un día concreto, un rango y un año. Esto limpia lo que escribe el admin en los selectores de
// fecha: formato AAAA-MM-DD válido, nunca en el futuro, desde ≤ hasta (si vienen al revés se dan la
// vuelta) y como mucho dos años seguidos. Fechas en hora de Madrid (lib/madridDay.ts).

export type AdminRange = { from: string; to: string }

export const ADMIN_RANGE_MIN = "2025-01-01"
export const ADMIN_RANGE_MAX_DAYS = 731

const ISO = /^\d{4}-\d{2}-\d{2}$/

function isRealDate(value: string): boolean {
  if (!ISO.test(value)) return false
  const d = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

const dayNumber = (value: string): number => Math.round(new Date(`${value}T12:00:00Z`).getTime() / 86400000)

// Nº de días del rango, contando los dos extremos (un solo día = 1).
export function rangeDays(range: AdminRange): number {
  return dayNumber(range.to) - dayNumber(range.from) + 1
}

export function normalizeRange(from: string, to: string, today: string, min: string = ADMIN_RANGE_MIN): AdminRange | null {
  if (!isRealDate(from) || !isRealDate(to) || !isRealDate(today)) return null
  let a = from <= to ? from : to
  let b = from <= to ? to : from
  if (b > today) b = today
  if (a > b) return null // todo el rango está en el futuro
  if (a < min) a = min
  if (a > b) return null // todo el rango es anterior al mínimo
  if (rangeDays({ from: a, to: b }) > ADMIN_RANGE_MAX_DAYS) return null
  return { from: a, to: b }
}

// Años con datos posibles: desde el del mínimo hasta el actual.
export function yearsUpTo(today: string, min: string = ADMIN_RANGE_MIN): number[] {
  const first = Number(min.slice(0, 4))
  const last = Number(today.slice(0, 4))
  const out: number[] = []
  for (let y = first; y <= last; y++) out.push(y)
  return out
}

// El año entero (o hasta hoy si es el actual).
export function yearRange(year: number, today: string): AdminRange | null {
  return normalizeRange(`${year}-01-01`, `${year}-12-31`, today)
}
