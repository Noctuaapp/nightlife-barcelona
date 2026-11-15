import type { CityKey } from "./cities"
import { TAXI_PHONES, type TaxiPhone } from "./taxiOptions"

// Transporte de cada ciudad (14/11/2026). Hasta hoy todo era de Barcelona (033, Plaça Catalunya, NitBus…); aquí va lo que
// cambia al mirar otra ciudad. Barcelona conserva exactamente lo de siempre.

export type CityTransit = {
  /** Radio taxis, sin espacios. El primero es el que sale en el botón «Llamar a Radio Taxi» de la ficha. */
  taxiPhones: readonly TaxiPhone[]
  /** Qué se busca en Google Maps para encontrar las paradas del bus nocturno cuando no hay datos propios. */
  nightBusSearch: string
  /** Donde converge casi toda la red de bus nocturno (Plaça Catalunya en Barcelona, Cibeles en Madrid). */
  nightBusHub: { lat: number; lon: number }
}

// Madrid (verificado el 14/11/2026 con la web de la UCM, la guía de teléfonos de Time Out y los listados de taxi de varios
// operadores, que coinciden): Radio Teléfono Taxi 91 547 82 00, Tele Taxi 91 371 21 31 y Radio-Taxi Independiente 91 405 12 13.
// Cibeles: de la N1 a la N24 salen de allí (la N25 y la N26, de Alonso Martínez), según EMT Madrid.
export const CITY_TRANSIT: Record<CityKey, CityTransit> = {
  barcelona: {
    taxiPhones: TAXI_PHONES,
    nightBusSearch: "nitbus",
    nightBusHub: { lat: 41.3869, lon: 2.1701 },
  },
  madrid: {
    taxiPhones: [
      { name: "Radio Teléfono Taxi", phone: "915478200" },
      { name: "Tele Taxi", phone: "913712131" },
      { name: "Radio-Taxi Independiente", phone: "914051213" },
    ],
    nightBusSearch: "búho EMT",
    nightBusHub: { lat: 40.4194, lon: -3.6928 },
  },
}

export function cityTransit(city: CityKey): CityTransit {
  return CITY_TRANSIT[city]
}

// La L6 de Madrid (la Circular) cierra a las 23:00 de domingo a jueves desde el 11/01/2026 por las obras de su automatización (viernes y sábado, horario
// normal; hay autobuses gratuitos de sustitución). Fuentes: aviso del CRTM del 09/01/2026 y notas de la Comunidad de Madrid (06/05/2026): las obras
// acaban antes de marzo de 2027. Como no hay fecha de fin exacta, el aviso se apaga solo el 01/03/2027: mejor quedarse sin él que dejarlo puesto
// cuando ya no valga. Revisar antes si Metro anuncia otro cierre.
export const MADRID_L6_EARLY_CLOSE = { from: "2026-01-11", until: "2027-03-01", closes: "23:00" } as const

/** ¿Hay que avisar de que la L6 cierra pronto? Solo si entre las líneas que se enseñan está la L6 y estamos dentro de la ventana. */
export function madridL6EarlyClose(lines: readonly string[], now: Date = new Date()): boolean {
  if (!lines.some((l) => l.trim().toUpperCase() === "L6")) return false
  const day = now.toISOString().slice(0, 10)
  return day >= MADRID_L6_EARLY_CLOSE.from && day < MADRID_L6_EARLY_CLOSE.until
}
