// ¿Qué noches de la semana es «de noche» un esencial? (2/11/2026)
//
// Criterio de Noctua: un esencial (farmacia, comida, súper, gasolinera) es «de noche» una noche si
// abre las 24 h ese día, o sigue abierto a la 1:00 de la madrugada, o cierra a la 1:00 o más tarde.
// Un sitio que solo cumple un día (p. ej. cierra a las 2:00 viernes y sábado, el resto a las 23:00)
// debe salir ese día y no los demás: de ahí el selector de día de Esenciales.
//
// Los días van como en el resto de la web de horarios: índice 0 = lunes … 6 = domingo, y «la noche
// del lunes» es la que EMPIEZA el lunes (un cierre a las 2:00 del martes cuenta para el lunes).
//
// El texto de open_hours se escribió de varias maneras a lo largo del tiempo, y aquí se entienden
// todas las que existen en la base de datos:
//   · formato de siempre:  «Monday to Friday 9:00 AM – 3:00 AM | Saturday Open 24 hours | Open 24 hours»
//   · solo la hora de cierre, escrita a mano: «Open until 3:00 AM daily», «1:00 AM», «Medianoche»,
//     «Hasta 1:30 AM viernes-domingo», «2:30 AM (3:00 AM sábado)», «Medianoche (1:00 AM viernes-sábado)»
// Lo que no se entiende devuelve null (mejor «no sé» que inventar un horario).

export type NightDays = boolean[] // 7 posiciones, 0 = lunes

type DayInfo = { full24: boolean; close: number | null; open1am: boolean }

const EN_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const ES_DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
const EN = `(${EN_DAYS.join("|")})`
const ES = `(${ES_DAYS.join("|")})`
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function strip(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// Días de a a b (con vuelta de semana: «viernes-lunes»).
function span(a: number, b: number): number[] {
  const out: number[] = []
  for (let d = a; ; d = (d + 1) % 7) {
    out.push(d)
    if (d === b) break
  }
  return out
}

// Hora de reloj (minutos desde las 0:00) de «3:00 AM», «11:30 pm» o «21:00».
function clock(h: string, m: string, ampm: string | undefined): number {
  let hour = parseInt(h, 10)
  if (ampm) hour = (hour % 12) + (ampm === "pm" ? 12 : 0)
  return (hour % 24) * 60 + parseInt(m, 10)
}

// Una hora de CIERRE sola («1:00 AM», «Medianoche»): antes de las 12:00 se entiende que es de la
// madrugada siguiente. Devuelve los minutos desde las 0:00 del día en que abre (1500 = 1:00 de la noche).
function closeFrom(text: string): { close: number; rest: string } | null {
  const mid = text.match(/medianoche|midnight/)
  const tm = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/)
  if (mid && (!tm || (mid.index ?? 0) < (tm.index ?? 0))) {
    return { close: 1440, rest: text.slice((mid.index ?? 0) + mid[0].length) }
  }
  if (!tm) return null
  let c = clock(tm[1], tm[2], tm[3])
  if (c < 720) c += 1440
  return { close: c, rest: text.slice((tm.index ?? 0) + tm[0].length) }
}

// «viernes-domingo», «sábado», «daily»… → los días a los que se refiere (todos si no dice ninguno).
function daysFrom(text: string): number[] {
  if (/daily|diari|todos los dias|cada dia/.test(text)) return ALL_DAYS
  const m = text.match(new RegExp(`${ES}(?:\\s*(?:-|a|al)\\s*${ES})?`))
  if (!m) return ALL_DAYS
  const a = ES_DAYS.indexOf(m[1])
  return span(a, m[2] ? ES_DAYS.indexOf(m[2]) : a)
}

function raise(info: DayInfo[], days: number[], close: number) {
  for (const d of days) info[d].close = Math.max(info[d].close ?? 0, close)
}

// Frase con el formato de siempre: día(s) opcional(es) + «Open 24 hours» o «H:MM AM – H:MM AM».
function standardClause(c: string, info: DayInfo[]): boolean {
  const dm = c.match(new RegExp(`^${EN}(?:\\s+to\\s+${EN})?\\s*:?\\s*`))
  const days = dm ? span(EN_DAYS.indexOf(dm[1]), EN_DAYS.indexOf(dm[2] ?? dm[1])) : ALL_DAYS
  const rest = dm ? c.slice(dm[0].length) : c

  if (/\b24\s*(?:hours|horas|hrs|h)\b|24\/7/.test(rest)) {
    for (const d of days) { info[d].full24 = true; info[d].open1am = true } // abierto 24 h = abierto a la 1:00
    return true
  }
  const r = rest.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(am|pm)?/)
  if (!r) return false
  const s = clock(r[1], r[2], r[3])
  let e = clock(r[4], r[5], r[6])
  if (e === s) { // abierto de una hora a la misma hora: 24 h
    for (const d of days) { info[d].full24 = true; info[d].open1am = true }
    return true
  }
  if (e < s) e += 1440
  for (const d of days) {
    raise(info, [d], e)
    if (s === 0 && e >= 1440) info[d].full24 = true
    if (s <= 60 && e >= 60) info[d].open1am = true
  }
  return true
}

// Frase con solo la hora de cierre, con días opcionales y excepciones entre paréntesis.
function closeOnlyClause(main: string, info: DayInfo[]): boolean {
  const head = main.trim().replace(/^(?:open\s+until|until|hasta(?:\s+las)?|cierra(?:\s+a\s+las)?)\s+/, "")
  const base = closeFrom(head)
  if (!base) return false
  raise(info, daysFrom(base.rest), base.close)
  return true
}

export function nightDays(raw: string | null | undefined): NightDays | null {
  const text = strip((raw || "").replace(/[\u202f\u00a0]/g, " ").toLowerCase()).trim()
  if (!text) return null
  const info: DayInfo[] = Array.from({ length: 7 }, () => ({ full24: false, close: null, open1am: false }))
  let understood = false

  for (const clause of text.split("|")) {
    const c = clause.trim()
    if (!c) continue
    const groups = [...c.matchAll(/\(([^)]*)\)/g)].map((g) => g[1])
    const main = c.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim()
    if (!(standardClause(main, info) || closeOnlyClause(main, info))) continue
    understood = true
    // Excepciones entre paréntesis: «(3:00 AM sábado)», «(viernes-sábado hasta las 2:00 AM)».
    for (const g of groups) {
      const ex = closeFrom(g.trim())
      if (ex) raise(info, daysFrom(ex.rest.length ? ex.rest : g), ex.close)
    }
  }
  if (!understood) return null
  return ALL_DAYS.map((d) => info[d].full24 || (info[d].close !== null && info[d].close >= 1500) || info[(d + 1) % 7].open1am)
}

export function qualifiesOnDay(raw: string | null | undefined, day: number): boolean {
  return nightDays(raw)?.[day] === true
}

// La noche de «hoy» para quien sale: hasta las 6:00 todavía es la noche del día anterior (a las 2:00
// del sábado se está en la noche del viernes). 0 = lunes. Siempre con la hora de Madrid.
export function tonightIndex(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now)
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase()
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10)
  if (hour === 24) hour = 0
  const day = Math.max(0, EN_DAYS.indexOf(weekday))
  return hour < 6 ? (day + 6) % 7 : day
}
