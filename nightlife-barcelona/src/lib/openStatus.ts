// Interpreta el texto de horario de la tabla essentials ("Monday to Sunday 9:00 AM – 3:00 AM",
// "Open 24 hours", "Friday: 12:00 PM – 2:00 AM", "Until 03:00"...) y dice si el sitio está
// abierto AHORA, siempre con la hora de Madrid (no la del dispositivo).
//
// Los horarios que vienen de un solo día ("Monday: ...") solo valen para ese día: si hoy es
// otro día no se puede saber, y se devuelve "unknown" en vez de adivinar.

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
const DAY_RE = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"

export type OpenStatus = {
  state: "open" | "closed" | "unknown"
  soon: boolean // abierto pero cierra en menos de una hora
  label: string // texto corto en castellano; vacío si no se sabe nada útil
}

const UNKNOWN: OpenStatus = { state: "unknown", soon: false, label: "" }

function madridNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase()
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10)
  if (hour === 24) hour = 0
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10)
  return { day: Math.max(0, DAYS.indexOf(weekday)), minutes: hour * 60 + minute }
}

function to24(h: string, m: string, ampm: string | undefined): number {
  let hour = parseInt(h, 10)
  if (ampm) {
    hour = hour % 12
    if (ampm.toLowerCase() === "pm") hour += 12
  }
  return (hour % 24) * 60 + parseInt(m, 10)
}

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function dayInRange(day: number, from: number, to: number): boolean {
  return from <= to ? day >= from && day <= to : day >= from || day <= to
}

export function getOpenStatus(raw: string | null | undefined): OpenStatus {
  if (!raw || !raw.trim()) return UNKNOWN
  try {
    const now = madridNow()
    const lower = raw.trim().toLowerCase()

    const dm = lower.match(new RegExp(`^${DAY_RE}(?:\\s+to\\s+${DAY_RE})?\\s*:?\\s*`))
    const hasDay = !!dm
    const from = dm ? DAYS.indexOf(dm[1]) : 0
    const to = dm ? (dm[2] ? DAYS.indexOf(dm[2]) : from) : 6
    const rest = dm ? lower.slice(dm[0].length) : lower

    const todayIn = !hasDay || dayInRange(now.day, from, to)
    const yesterdayIn = !hasDay || dayInRange((now.day + 6) % 7, from, to)

    if (/24\s*hours/.test(rest)) {
      return todayIn ? { state: "open", soon: false, label: "Abierto 24 h" } : UNKNOWN
    }

    const range = rest.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(am|pm)?/)
    if (range) {
      const open = to24(range[1], range[2], range[3])
      const close = to24(range[4], range[5], range[6])
      if (open === close) return todayIn ? { state: "open", soon: false, label: "Abierto 24 h" } : UNKNOWN
      if (!todayIn && !yesterdayIn) return UNKNOWN

      const crossesMidnight = close < open
      const isOpen = crossesMidnight
        ? (todayIn && now.minutes >= open) || (yesterdayIn && now.minutes < close)
        : todayIn && now.minutes >= open && now.minutes < close

      if (isOpen) {
        const untilClose = crossesMidnight && now.minutes >= open ? 24 * 60 - now.minutes + close : close - now.minutes
        const soon = untilClose <= 60
        return {
          state: "open",
          soon,
          label: soon ? `Cierra pronto · ${fmt(close)}` : `Abierto · hasta ${fmt(close)}`,
        }
      }
      // Solo se puede decir "abre a..." con certeza si el horario de hoy aplica.
      return { state: "closed", soon: false, label: todayIn ? `Cerrado · abre ${fmt(open)}` : "Cerrado" }
    }

    const until = rest.match(/until\s+(\d{1,2}):(\d{2})\s*(am|pm)?/)
    if (until) return { state: "unknown", soon: false, label: `Hasta las ${fmt(to24(until[1], until[2], until[3]))}` }

    return UNKNOWN
  } catch {
    return UNKNOWN
  }
}
