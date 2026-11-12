// Editor de horario por días (06/11/2026). Antes el horario era un texto suelto ("23:55-06:00") y los días
// que abre iban aparte, así que un local que abre jueves 21:00 y sábado 23:00 no se podía poner bien. Ahora el
// admin y «Mi club» marcan cada día y piden su hora de inicio y de fin; aquí se compone el texto que la web ya
// sabe leer (lib/clubHours.ts), por ejemplo "J-S 23:55-06:00 | D 19:00-01:00", y los días de apertura.
//
// Criterio de los días: cada fila es la NOCHE de ese día (como open_days). Un horario que cruza la medianoche
// (23:55 → 06:00) cae en el mismo día. Si empieza pasada la medianoche (00:00 → 06:00) el texto lleva la letra
// del día siguiente, porque clubOpenNow lee las letras como día de calendario, mientras que open_days sigue
// guardando la noche (viernes) para el filtro «abre este día».
import { expandDays, openDaysToLetters } from "./clubHours"

// Orden de la semana (lunes primero). Mismo orden que las letras del horario y los nombres de open_days.
export const HOURS_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const
export const HOURS_DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const

export type DayRow = { on: boolean; start: string; end: string }

const SEGMENT = /^(?:([LMXJVSD/\-]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function emptyRows(): DayRow[] {
  return HOURS_LETTERS.map(() => ({ on: false, start: "", end: "" }))
}

const toMinutes = (hhmm: string) => parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3, 5), 10)

// ¿Empieza pasada la medianoche sin cruzarla (00:00 → 06:00)? Entonces el horario cae ya en el día siguiente.
export function startsAfterMidnight(start: string, end: string): boolean {
  if (!TIME.test(start) || !TIME.test(end)) return false
  return toMinutes(end) > toMinutes(start) && toMinutes(start) < 6 * 60
}

export function rowIsComplete(r: DayRow): boolean {
  return r.on && TIME.test(r.start) && TIME.test(r.end) && r.start !== r.end
}

// Texto de horario + días de apertura guardados → una fila por día. Si el texto no se puede repartir por días
// (formatos libres como "Viernes-sábado hasta las 3:00", o dos franjas para el mismo día) las filas salen sin
// horas y el texto original se devuelve en `legacy` para que se vea y no se pierda sin querer.
export function rowsFromClub(
  hours: string | null | undefined,
  openDays: string[] | null | undefined
): { rows: DayRow[]; legacy: string } {
  const text = (hours || "").trim()
  const openLetters = openDaysToLetters(openDays)
  const rows = emptyRows()
  const markOpenDays = () => {
    for (const l of openLetters || []) rows[HOURS_LETTERS.indexOf(l as (typeof HOURS_LETTERS)[number])].on = true
  }
  if (!text) {
    markOpenDays()
    return { rows, legacy: "" }
  }

  const parsed = emptyRows()
  for (const raw of text.split(/[,|;]/)) {
    const seg = raw.trim()
    if (!seg) continue
    const m = seg.match(SEGMENT)
    if (!m) return fail()
    const start = `${m[2].padStart(2, "0")}:${m[3]}`
    const end = `${m[4].padStart(2, "0")}:${m[5]}`
    if (!TIME.test(start) || !TIME.test(end) || start === end) return fail()
    const early = startsAfterMidnight(start, end)

    // Con letras son días de calendario; sin letras valen los días de apertura (o todos), que ya son noches.
    const letters = m[1] ? expandDays(m[1]) : openLetters || [...HOURS_LETTERS]
    if (letters.length === 0) return fail()
    for (const l of letters) {
      let idx = HOURS_LETTERS.indexOf(l as (typeof HOURS_LETTERS)[number])
      if (idx < 0) return fail()
      if (m[1] && early) idx = (idx + 6) % 7
      if (parsed[idx].on) return fail() // dos franjas para el mismo día: no cabe en una fila
      parsed[idx] = { on: true, start, end }
    }
  }
  return { rows: parsed, legacy: "" }

  function fail() {
    markOpenDays()
    return { rows, legacy: text }
  }
}

function runs(indexes: number[]): string {
  const sorted = [...indexes].sort((a, b) => a - b)
  if (sorted.length === 7) return "L-D"
  const out: string[] = []
  let from = sorted[0]
  let prev = sorted[0]
  const flush = () => out.push(from === prev ? HOURS_LETTERS[from] : `${HOURS_LETTERS[from]}-${HOURS_LETTERS[prev]}`)
  for (const i of sorted.slice(1)) {
    if (i === prev + 1) prev = i
    else {
      flush()
      from = i
      prev = i
    }
  }
  flush()
  return out.join("/")
}

// Filas → texto de horario ("J-S 23:55-06:00 | D 19:00-01:00") y días de apertura ("Jue", "Vie"…).
// Los días marcados sin las dos horas no entran en el texto, pero sí en los días de apertura.
export function compileRows(rows: DayRow[]): { hours: string; openDays: string[] } {
  const groups = new Map<string, { early: boolean; days: number[] }>()
  rows.forEach((r, i) => {
    if (!rowIsComplete(r)) return
    const key = `${r.start}-${r.end}`
    const g = groups.get(key) || { early: startsAfterMidnight(r.start, r.end), days: [] }
    g.days.push(i)
    groups.set(key, g)
  })
  const hours = Array.from(groups.entries())
    .map(([key, g]) => `${runs(g.early ? g.days.map((i) => (i + 1) % 7) : g.days)} ${key}`)
    .join(" | ")
  const openDays = rows.flatMap((r, i) => (r.on ? [HOURS_DAY_NAMES[i]] : []))
  return { hours, openDays }
}

// Las filas agrupadas por horario: [{ time: "00:30–05:00", days: [3] }, { time: "00:30–06:00", days: [4, 5] }]. Los días son
// índices de noche (0 = lunes). Solo entran las filas completas.
export function groupRows(rows: DayRow[]): { time: string; days: number[] }[] {
  const groups = new Map<string, number[]>()
  rows.forEach((r, i) => {
    if (!rowIsComplete(r)) return
    const key = `${r.start}–${r.end}`
    groups.set(key, [...(groups.get(key) || []), i])
  })
  return Array.from(groups.entries()).map(([time, days]) => ({ time, days }))
}

// [4, 5] → "Vie-Sáb"; [3, 5] → "Jue/Sáb".
export function dayRuns(idx: number[], names: readonly string[] = HOURS_DAY_NAMES): string {
  const out: string[] = []
  let from = idx[0]
  let prev = idx[0]
  const flush = () => out.push(from === prev ? names[from] : `${names[from]}-${names[prev]}`)
  for (const i of idx.slice(1)) {
    if (i === prev + 1) prev = i
    else {
      flush()
      from = i
      prev = i
    }
  }
  flush()
  return out.join("/")
}

// Las filas tal como las marca la persona (por NOCHES): "Jue 00:30–05:00 · Vie-Sáb 00:30–06:00". Sirve para enseñar en el
// admin lo que se ha marcado, porque el texto que se guarda usa el día de calendario cuando empieza de madrugada
// ("V 00:30-05:00 | S-D 00:30-06:00") y a simple vista parece que los días se han movido.
export function describeRows(rows: DayRow[], names: readonly string[] = HOURS_DAY_NAMES): string {
  return groupRows(rows)
    .map((g) => `${dayRuns(g.days, names)} ${g.time}`)
    .join(" · ")
}

// ¿Alguna fila empieza de madrugada? Entonces las letras del texto guardado van un día por delante de las filas.
export function hasEarlyRows(rows: DayRow[]): boolean {
  return rows.some((r) => rowIsComplete(r) && startsAfterMidnight(r.start, r.end))
}
