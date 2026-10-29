// «Qué está pasando» de la portada (30/10/2026): solo eventos de hoy y de los 2 días siguientes.
// Antes enseñaba cualquier evento de hoy en adelante, así que en octubre salía un festival de
// noviembre bajo «Qué está pasando». Las fechas son AAAA-MM-DD (como se guardan en events y
// club_events), que se pueden comparar como texto.

export const HOME_EVENTS_DAYS_AHEAD = 2

// Suma (o resta) días a una fecha AAAA-MM-DD sin que la zona horaria la mueva de día.
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// La noche en curso, en hora de Madrid. Hasta las 6:00 todavía es la noche de ayer (a las 2:00 del
// sábado se sigue en la fiesta del viernes), el mismo criterio que el filtro «Elige un día» y el Plan.
export function nightDateMadrid(now: Date = new Date()): string {
  const ymd = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
  const hour = parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(now), 10) % 24
  return hour < 6 ? addDaysYmd(ymd, -1) : ymd
}

// ¿Ocurre el evento en ese día? Un día suelto, o dentro de su rango si dura varios (date_end).
export function eventHappensOn(date: string | null | undefined, dateEnd: string | null | undefined, day: string): boolean {
  if (!date) return false
  const start = date.slice(0, 10)
  const end = (dateEnd || date).slice(0, 10)
  return start <= day && day <= (end < start ? start : end)
}

// ¿Cae el evento (o parte de él, si dura varios días) entre hoy y hoy + 2 días? Sin fecha, no.
export function eventInHomeWindow(
  date: string | null | undefined,
  dateEnd: string | null | undefined,
  today: string,
  daysAhead: number = HOME_EVENTS_DAYS_AHEAD
): boolean {
  if (!date) return false
  const start = date.slice(0, 10)
  const end = (dateEnd || date).slice(0, 10)
  const last = end < start ? start : end
  return start <= addDaysYmd(today, daysAhead) && last >= today
}
