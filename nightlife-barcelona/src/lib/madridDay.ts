// Fechas «de calendario» en hora de Madrid para el admin (30/10/2026).
// Antes Resumen, Datos y Actividad calculaban «hoy» con el reloj del navegador, y Visitas con la
// hora de Madrid: desde otro huso horario (o de madrugada) las pantallas no coincidían. Todo el
// admin usa ahora este mismo «hoy». Formato AAAA-MM-DD.
const TZ = "Europe/Madrid"

export const madridIsoDay = (d: Date): string => d.toLocaleDateString("sv-SE", { timeZone: TZ })

export const madridToday = (): string => madridIsoDay(new Date())

// Se desplaza sobre una fecha UTC al mediodía para que el cambio de hora (marzo y octubre) nunca
// mueva el resultado un día.
function shift(days: number): string {
  const base = new Date(`${madridToday()}T12:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export const madridDaysAgo = (n: number): string => shift(-n)
export const madridDaysAhead = (n: number): string => shift(n)
export const madridYear = (): number => Number(madridToday().slice(0, 4))
