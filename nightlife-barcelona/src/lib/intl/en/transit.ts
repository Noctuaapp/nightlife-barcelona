// Transporte nocturno en inglés (10/11/2026): recorridos del Nitbus traducidos y horario del metro.
// Los horarios del metro son los oficiales de TMB (tmb.cat/en/horaris, leídos el 10/11/2026) y coinciden con
// lib/transitHours.ts, que es lo que usa la web en español.

/** "Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)" → "... (via Gràcia and Canyelles)". Los nombres de lugar no se tocan. */
export function busRouteEn(route: string): string {
  return route
    .replace(/Circular por el centro/g, "Circular route through the centre")
    .replace(/\bvía\b/g, "via")
    .replace(/\sy\s/g, " and ")
    .replace(/\bAeroport\b/g, "Airport")
}

export type MetroHoursRow = { when: string; hours: string }

/** Horario del metro de Barcelona (TMB). La hora de cierre es la de salida del último tren desde cada cabecera. */
export const METRO_HOURS: MetroHoursRow[] = [
  { when: "Monday to Thursday", hours: "05:00 – 00:00" },
  { when: "Friday and the night before a public holiday", hours: "05:00 – 02:00" },
  { when: "Saturday", hours: "From 05:00, then non-stop all night" },
  { when: "Sunday", hours: "Non-stop from Saturday night until 00:00" },
]

export const METRO_HOURS_NOTE =
  "On a few special nights (Sant Joan on 23 June and New Year's Eve) the metro also runs all night. Times can change, so check TMB before a big night."

/** Tarifas urbanas del taxi de Barcelona 2026 (AMB). T-2 = noches entre semana (20:00–08:00), sábados y festivos. */
export const TAXI_2026 = {
  minFare: "€2.80",
  perKmDay: "€1.35",
  perKmNight: "€1.66",
  waitingPerHour: "€27.75",
  airportSurcharge: "€4.60",
  satsSurcharge: "€2.55",
  fromAirportMinimum: "€21",
  appBookingMinimum: "€8",
  holidayEveSurcharge: "€4.60",
} as const

/** Teléfonos de radiotaxi que ya usa la web en español (essentials/[category]). */
export const TAXI_PHONES = [
  { name: "Radio Taxi 033", phone: "933 033 033", tel: "933033033" },
  { name: "Fonotaxi", phone: "933 001 100", tel: "933001100" },
] as const

export const SOURCES = {
  tmbHours: { name: "TMB – Operating hours", url: "https://www.tmb.cat/en/horaris" },
  amb: { name: "AMB (operator of the night bus)", url: "https://www.amb.cat" },
  taxiAmb: { name: "AMB Taxi – 2026 urban fares", url: "https://taxi.amb.cat/en/usuaris/tarifes-del-taxi" },
  ordinance: { name: "Ara – Key points of Barcelona's new coexistence ordinance", url: "https://en.ara.cat/society/the-key-points-of-barcelona-s-new-coexistence-ordinance_1_5649269.html" },
} as const
