// Horario de un club (campo "hours" de la tabla clubs) → ¿está abierto ahora? Siempre con la hora
// de Madrid, no la del móvil (un turista con el reloj en otra zona veía horarios equivocados).
//
// Antes había TRES versiones distintas de esta lógica (home, listado de clubs y "Sorpréndeme"),
// cada una con sus fallos: la de la home no entendía "00:00-05:00" sin días y marcaba casi todo
// como "Cerrado"; la del listado no entendía comas; ninguna miraba los días de apertura que se
// guardan desde el admin (open_days). Ahora hay una sola, que acepta todos los formatos que hay en
// la base de datos:
//   "23:55-06:00"                      → todos los días (o solo los de open_days, si los hay)
//   "L/M/X 23:00-06:00, V/S 23:00-07:00" → por días (D L M X J V S)
//   "J-S 00:00-06:00 | D 19:00-01:00"    → rangos de días y separador "|"
// Devuelve null si no se puede interpretar (mejor "no sé" que decir que está abierto).

const DAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"] // índice = getDay() (0 = domingo)
const WEEK_ORDER = ["L", "M", "X", "J", "V", "S", "D"]
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

// open_days se guarda desde el admin como "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom".
const OPEN_DAY_TO_LETTER: Record<string, string> = {
  lun: "L", mar: "M", mie: "X", mié: "X", jue: "J", vie: "V", sab: "S", sáb: "S", dom: "D",
}

export function madridClock(): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const wd = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase()
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10)
  if (hour === 24) hour = 0
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10)
  return { dow: Math.max(0, WEEKDAYS.indexOf(wd)), minutes: hour * 60 + minute }
}

function expandDays(token: string): string[] {
  const out = new Set<string>()
  for (const part of token.split("/")) {
    const p = part.trim()
    if (!p) continue
    const range = p.match(/^([LMXJVSD])-([LMXJVSD])$/)
    if (range) {
      const from = WEEK_ORDER.indexOf(range[1])
      const to = WEEK_ORDER.indexOf(range[2])
      for (let i = 0; i < 7; i++) {
        const idx = (from + i) % 7
        out.add(WEEK_ORDER[idx])
        if (idx === to) break
      }
    } else if (/^[LMXJVSD]$/.test(p)) {
      out.add(p)
    }
  }
  return Array.from(out)
}

function openDaysToLetters(openDays?: string[] | null): string[] | null {
  if (!openDays || openDays.length === 0) return null
  const letters = openDays
    .map((d) => OPEN_DAY_TO_LETTER[d.trim().toLowerCase().slice(0, 3)] || OPEN_DAY_TO_LETTER[d.trim().toLowerCase()])
    .filter(Boolean)
  return letters.length ? letters : null
}

export function clubOpenNow(hours: string | null | undefined, openDays?: string[] | null): boolean | null {
  if (!hours || !hours.trim()) return null
  try {
    const { dow, minutes } = madridClock()
    const today = DAY_LETTERS[dow]
    const yesterday = DAY_LETTERS[(dow + 6) % 7]
    const openLetters = openDaysToLetters(openDays)
    let parsed = false

    for (const raw of hours.split(/[,|;]/)) {
      const m = raw
        .trim()
        .match(/^(?:([LMXJVSD/\-]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
      if (!m) continue
      parsed = true
      const start = parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
      let end = parseInt(m[4], 10) * 60 + parseInt(m[5], 10)
      const overnight = end <= start
      if (overnight) end += 24 * 60

      // Horario sin días + días de apertura del admin: "Vie" significa la noche del viernes, que
      // sigue siendo viernes hasta las 06:00 del sábado (un "00:00-05:00" de viernes cae ya en sábado).
      if (!m[1] && openLetters) {
        const nightDay = minutes < 6 * 60 ? yesterday : today
        if (!openLetters.includes(nightDay)) continue
        if ((minutes >= start && minutes < end) || (overnight && minutes + 24 * 60 < end)) return true
        continue
      }

      const days = m[1] ? expandDays(m[1]) : DAY_LETTERS
      if (days.includes(today) && minutes >= start && minutes < end) return true
      if (overnight && days.includes(yesterday) && minutes + 24 * 60 < end) return true
    }
    return parsed ? false : null
  } catch {
    return null
  }
}

// ¿Abre el club la noche de ese día de la semana (0 = domingo)? false solo si se sabe que no
// (por open_days o por los días del horario); null si no hay datos para saberlo.
export function clubOpensOn(hours: string | null | undefined, openDays: string[] | null | undefined, dow: number): boolean | null {
  const letter = DAY_LETTERS[dow]
  const openLetters = openDaysToLetters(openDays)
  if (openLetters) return openLetters.includes(letter)
  if (!hours || !hours.trim()) return null
  let withDays = false
  let match = false
  for (const raw of hours.split(/[,|;]/)) {
    const m = raw.trim().match(/^(?:([LMXJVSD/\-]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
    if (!m) continue
    if (!m[1]) return true
    withDays = true
    if (expandDays(m[1]).includes(letter)) match = true
  }
  return withDays ? match : null
}

// Horario en el formato de Google (schema.org OpeningHoursSpecification) para los datos
// estructurados de la ficha (27/10/2026). Parte de los mismos datos y formatos que clubOpenNow; si
// no se puede interpretar no devuelve nada (mejor sin horario que con uno inventado).
//   · Con días en el texto ("V/S 23:00-06:00") se usan esos días.
//   · Sin días y con open_days del admin se usan esos; un horario que empieza de madrugada
//     ("00:00-05:00") cuenta como la noche anterior, como en clubOpenNow, así que se pasa al día
//     siguiente.
//   · Si cruza la medianoche, "closes" es una hora menor que "opens" (así lo entiende Google).
const SCHEMA_DAY: Record<string, string> = {
  L: "Monday", M: "Tuesday", X: "Wednesday", J: "Thursday", V: "Friday", S: "Saturday", D: "Sunday",
}

export function clubOpeningHoursSpec(
  hours: string | null | undefined,
  openDays?: string[] | null
): { "@type": "OpeningHoursSpecification"; dayOfWeek: string[]; opens: string; closes: string }[] {
  if (!hours || !hours.trim()) return []
  const openLetters = openDaysToLetters(openDays)
  const hhmm = (h: string, m: string) => `${h.padStart(2, "0")}:${m}`
  const out: { "@type": "OpeningHoursSpecification"; dayOfWeek: string[]; opens: string; closes: string }[] = []

  for (const raw of hours.split(/[,|;]/)) {
    const m = raw.trim().match(/^(?:([LMXJVSD/\-]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
    if (!m) continue
    const startMin = parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
    const endMin = parseInt(m[4], 10) * 60 + parseInt(m[5], 10)
    if (parseInt(m[2], 10) > 23 || parseInt(m[4], 10) > 23 || parseInt(m[3], 10) > 59 || parseInt(m[5], 10) > 59) continue
    if (startMin === endMin) continue

    let letters: string[]
    if (m[1]) letters = expandDays(m[1])
    else if (openLetters) {
      const overnight = endMin <= startMin
      const shift = !overnight && startMin < 6 * 60 // empieza de madrugada → es ya el día siguiente
      letters = shift ? openLetters.map((l) => WEEK_ORDER[(WEEK_ORDER.indexOf(l) + 1) % 7]) : openLetters
    } else letters = WEEK_ORDER
    if (letters.length === 0) continue

    out.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: WEEK_ORDER.filter((l) => letters.includes(l)).map((l) => SCHEMA_DAY[l]),
      opens: hhmm(m[2], m[3]),
      closes: hhmm(m[4], m[5]),
    })
  }
  return out
}
