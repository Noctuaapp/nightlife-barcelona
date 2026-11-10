// Transporte nocturno en inglés (10/11/2026). Desde el 10/11/2026 los datos son comunes a los cuatro idiomas
// (lib/intl/transit.ts); este archivo deja los de inglés con los nombres de siempre.

import { busRouteOf, metroHoursOf, metroNoteOf, sourcesOf, taxiFaresOf, TAXI_PHONES } from "../transit"

export type { MetroHoursRow } from "../transit"
export { TAXI_PHONES }

export const busRouteEn = (route: string): string => busRouteOf("en", route)

export const METRO_HOURS = metroHoursOf("en")
export const METRO_HOURS_NOTE = metroNoteOf("en")
export const TAXI_2026 = taxiFaresOf("en")
export const SOURCES = sourcesOf("en")
