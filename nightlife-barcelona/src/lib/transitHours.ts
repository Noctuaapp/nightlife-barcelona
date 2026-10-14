import { madridClock } from "./clubHours"

// Horario del Metro de Barcelona (TMB), siempre con la hora de Madrid:
//   lunes a jueves y domingo: 05:00–00:00
//   viernes y vísperas de festivo: 05:00–02:00
//   sábado: servicio continuo toda la noche hasta el domingo a las 00:00
//   noches especiales (Sant Joan y Nochevieja): servicio continuo habitual
// Festivos de Barcelona 2026 según el Ajuntament (ajuntament.barcelona.cat/calendarifestius).
// 2027 es provisional: festivos fijos + Semana Santa y Segunda Pascua calculadas; revisar cuando
// el Ajuntament publique el calendario.
const HOLIDAYS = new Set([
  // 2026
  "2026-01-01", "2026-01-06", "2026-04-03", "2026-04-06", "2026-05-01", "2026-05-25", "2026-06-24",
  "2026-08-15", "2026-09-11", "2026-09-24", "2026-10-12", "2026-12-08", "2026-12-25", "2026-12-26",
  // 2027 (provisional)
  "2027-01-01", "2027-01-06", "2027-03-26", "2027-03-29", "2027-05-01", "2027-05-17", "2027-06-24",
  "2027-08-15", "2027-09-11", "2027-09-24", "2027-10-12", "2027-11-01", "2027-12-06", "2027-12-08",
  "2027-12-25", "2027-12-26",
])

// Noches en las que el metro suele funcionar sin cerrar (fecha = el día en que empieza la noche).
const ALL_NIGHT = new Set(["2026-06-23", "2026-12-31", "2027-06-23", "2027-12-31"])

function madridDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
}

export type MetroTonight = {
  state: "open" | "closed"
  // Cierre de la noche en curso: "00:00", "02:00" o "all-night".
  closes: "00:00" | "02:00" | "all-night"
  isLate: boolean
}

// Cierre del servicio que EMPIEZA el día `dateStr` (día de la semana `dow`, 0 = domingo).
function closingFor(dateStr: string, dow: number): MetroTonight["closes"] {
  if (dow === 6 || ALL_NIGHT.has(dateStr)) return "all-night"
  const tomorrow = new Date(new Date(dateStr + "T12:00:00Z").getTime() + 86400000).toISOString().slice(0, 10)
  if (dow === 5 || HOLIDAYS.has(tomorrow)) return "02:00"
  return "00:00"
}

export function getMetroTonight(): MetroTonight {
  const { dow, minutes } = madridClock()
  if (minutes < 5 * 60) {
    // Madrugada: sigue el servicio de la noche anterior, si aún no ha cerrado.
    const yesterdayDow = (dow + 6) % 7
    const closes = closingFor(madridDate(-1), yesterdayDow)
    const open = closes === "all-night" || (closes === "02:00" && minutes < 2 * 60)
    return { state: open ? "open" : "closed", closes, isLate: closes !== "00:00" }
  }
  const closes = closingFor(madridDate(0), dow)
  return { state: "open", closes, isLate: closes !== "00:00" }
}
