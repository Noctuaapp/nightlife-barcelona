import { clubOpensOn } from "./clubHours"

// Filtro «Elige un día» del listado de clubs (30/10/2026): ¿qué clubs abren la noche de un día
// concreto de la semana? Los números son los de getDay(): 0 = domingo, 1 = lunes... 6 = sábado.

// Orden en que se enseñan los días en el filtro (lunes primero, como en el resto de la web).
export const WEEK_DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]

// «Hoy» para quien sale de fiesta: hasta las 6:00 todavía es la noche del día anterior (a las 2:00
// del sábado se está en la noche del viernes). Es el mismo criterio que usa clubOpenNow.
export function tonightDow(dow: number, minutes: number): number {
  return minutes < 6 * 60 ? (dow + 6) % 7 : dow
}

// Sin día elegido (null) pasan todos los clubs. Con día elegido solo pasan los que se SABE que abren
// esa noche (por sus días de apertura o por su horario): un club sin horario no se enseña, porque el
// filtro promete «abre ese día» y no se puede asegurar. Es el mismo criterio que el botón «Ahora».
export function clubMatchesDay(
  hours: string | null | undefined,
  openDays: string[] | null | undefined,
  dow: number | null
): boolean {
  if (dow === null) return true
  return clubOpensOn(hours, openDays, dow) === true
}
