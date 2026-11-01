// Horarios de OpenStreetMap (etiqueta opening_hours) → lo que necesita Noctua para los esenciales:
// saber si un sitio abre las 24 h o cierra pasada la 1:00, y guardarlo en el formato de texto que ya
// entiende getOpenStatus() («Monday to Friday 9:00 AM – 3:00 AM | Saturday Open 24 hours»).
//
// Solo se entiende la parte habitual de la sintaxis (días + horas, «24/7», «off», turnos partidos y
// reglas separadas por «;»). Lo raro (meses, semanas, amanecer/anochecer, «+», festivos con horario)
// devuelve null: es mejor «no sé» que un horario inventado.

export type Interval = [number, number] // minutos desde las 00:00 del día de apertura; el cierre puede pasar de 1440
export type WeekHours = Interval[][] // 0 = lunes … 6 = domingo

const DAY_TOKENS = ["mo", "tu", "we", "th", "fr", "sa", "su"]
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const D = "(?:Mo|Tu|We|Th|Fr|Sa|Su)"
const DAY_SPEC = new RegExp(`^(${D}(?:\\s*-\\s*${D})?(?:\\s*,\\s*${D}(?:\\s*-\\s*${D})?)*)\\s*(.*)$`, "i")
const UNSUPPORTED = /sunrise|sunset|dawn|dusk|easter|week|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|\[|\]|\+|"|\||\bopen\b|\bunknown\b|\d{4}/i

function expandDays(spec: string): number[] {
  const out = new Set<number>()
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-").map((x) => DAY_TOKENS.indexOf(x.trim().toLowerCase()))
    if (b === undefined) { out.add(a); continue }
    // «Fr-Mo» da la vuelta a la semana.
    for (let d = a; ; d = (d + 1) % 7) { out.add(d); if (d === b) break }
  }
  return [...out].sort((x, y) => x - y)
}

function parseTimes(rest: string): Interval[] | null {
  const intervals: Interval[] = []
  for (const piece of rest.split(",")) {
    const m = piece.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const sh = Number(m[1]), sm = Number(m[2]), eh = Number(m[3]), em = Number(m[4])
    if (sh > 23 || sm > 59 || eh > 24 || em > 59 || (eh === 24 && em !== 0)) return null
    const start = sh * 60 + sm
    let end = eh * 60 + em
    if (end === start) return null
    if (end < start) end += 1440 // cierra al día siguiente
    intervals.push([start, end])
  }
  return intervals.sort((x, y) => x[0] - y[0])
}

export function parseOsmHours(raw: string | null | undefined): WeekHours | null {
  const text = (raw || "").trim()
  if (!text) return null
  const all = (iv: Interval[]): WeekHours => Array.from({ length: 7 }, () => iv.map((i) => [...i] as Interval))
  if (/^24\/7$/i.test(text)) return all([[0, 1440]])
  if (UNSUPPORTED.test(text)) return null

  // Reglas separadas por «;» (la siguiente sustituye a la anterior en esos días) o por «, Día» (se suma).
  const rules: { rule: string; additive: boolean }[] = []
  const sep = /\s*(;|,(?=\s+(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)\b))\s*/gi
  let last = 0
  let additive = false
  let m: RegExpExecArray | null
  while ((m = sep.exec(text))) {
    rules.push({ rule: text.slice(last, m.index), additive })
    additive = m[1] === ","
    last = m.index + m[0].length
  }
  rules.push({ rule: text.slice(last), additive })

  const week: WeekHours = Array.from({ length: 7 }, () => [])
  for (const { rule: r, additive: add } of rules) {
    const rule = r.trim()
    if (!rule) continue
    if (/^(PH|SH)\b/i.test(rule)) continue // festivos: se ignoran
    const dm = rule.match(DAY_SPEC)
    const days = dm ? expandDays(dm[1]) : [0, 1, 2, 3, 4, 5, 6]
    const rest = (dm ? dm[2] : rule).trim()
    let intervals: Interval[] | null
    if (/^(off|closed)$/i.test(rest)) intervals = []
    else if (/^24\/7$/i.test(rest)) intervals = [[0, 1440]]
    else intervals = rest ? parseTimes(rest) : null
    if (!intervals) return null
    for (const d of days) week[d] = add ? [...week[d], ...intervals.map((i) => [...i] as Interval)] : intervals.map((i) => [...i] as Interval)
  }
  return week.some((d) => d.length > 0) ? week : null
}

const FULL_DAY = (iv: Interval[]) => iv.length === 1 && iv[0][0] === 0 && iv[0][1] >= 1440

export function isOpen24h(week: WeekHours): boolean {
  return week.every(FULL_DAY)
}

export function hasFullDay(week: WeekHours): boolean {
  return week.some(FULL_DAY)
}

// ¿Está abierto en algún momento entre la 1:00 y las 6:00? (cierra pasada la 1:00 o abre de madrugada)
export function opensPastOne(week: WeekHours): boolean {
  return week.some((day) => day.some(([s, e]) => (s < 360 && e > 60) || (s < 1800 && e > 1500)))
}

// «24 h o abierto pasada la 1:00»: el criterio de Noctua para un esencial de noche.
export function isNightEssentialHours(week: WeekHours): boolean {
  return isOpen24h(week) || hasFullDay(week) || opensPastOne(week)
}

// ¿Abierto el día `day` (0 = lunes) a los `minutes` desde medianoche? Cuenta lo que viene del día anterior.
export function isOpenAt(week: WeekHours, day: number, minutes: number): boolean {
  if (week[day].some(([s, e]) => minutes >= s && minutes < Math.min(e, 1440))) return true
  return week[(day + 6) % 7].some(([, e]) => e > 1440 && minutes < e - 1440)
}

function fmt12(total: number): string {
  const m = total % 1440
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, "0")
  return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`
}

// Texto para la columna open_hours de essentials, en el formato de getOpenStatus(). Los días en que
// OpenStreetMap no da horario no llevan frase (la web dirá «no sé», no «cerrado»).
export function toNoctuaHours(week: WeekHours): string {
  if (isOpen24h(week)) return "Open 24 hours"
  const groups = new Map<string, { days: number[]; intervals: Interval[] }>()
  week.forEach((intervals, d) => {
    if (intervals.length === 0) return
    const key = JSON.stringify(intervals)
    const g = groups.get(key)
    if (g) g.days.push(d)
    else groups.set(key, { days: [d], intervals })
  })
  const clauses: string[] = []
  for (const { days, intervals } of groups.values()) {
    // Tramos de días seguidos: Lun–Vie, Sáb…
    const runs: number[][] = []
    for (const d of days) {
      const run = runs[runs.length - 1]
      if (run && run[run.length - 1] === d - 1) run.push(d)
      else runs.push([d])
    }
    for (const run of runs) {
      const label = run.length === 1 ? DAY_NAMES[run[0]] : `${DAY_NAMES[run[0]]} to ${DAY_NAMES[run[run.length - 1]]}`
      for (const iv of intervals) {
        clauses.push(FULL_DAY([iv]) ? `${label} Open 24 hours` : `${label} ${fmt12(iv[0])} – ${fmt12(iv[1])}`)
      }
    }
  }
  return clauses.join(" | ")
}
