// Horario de un club (campo "hours" de la tabla clubs) → ¿está abierto ahora? Acepta los dos
// formatos que existen en la base de datos: "23:55-06:00" (todos los días) y con días,
// "L/M/X 23:00-06:00, V/S 23:00-07:00" (D L M X J V S). Siempre con la hora de Madrid.
// Devuelve null si no se puede interpretar (mejor "no sé" que decir que está abierto).

const DAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"] // índice = getDay() (0 = domingo)
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

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

export function clubOpenNow(hours: string | null | undefined): boolean | null {
  if (!hours || !hours.trim()) return null
  try {
    const { dow, minutes } = madridClock()
    const today = DAY_LETTERS[dow]
    const yesterday = DAY_LETTERS[(dow + 6) % 7]
    let parsed = false

    for (const raw of hours.split(",")) {
      const m = raw.trim().match(/^(?:([A-Z/]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
      if (!m) continue
      parsed = true
      const days = m[1] ? m[1].split("/") : DAY_LETTERS
      const start = parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
      let end = parseInt(m[4], 10) * 60 + parseInt(m[5], 10)
      const overnight = end <= start
      if (overnight) end += 24 * 60

      if (days.includes(today) && minutes >= start && minutes < end) return true
      if (overnight && days.includes(yesterday) && minutes + 24 * 60 < end) return true
    }
    return parsed ? false : null
  } catch {
    return null
  }
}
