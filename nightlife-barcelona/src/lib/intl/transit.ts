// Transporte nocturno en cuatro idiomas (10/11/2026 inglés; 10/11/2026 alemán, francés e italiano): recorridos
// del Nitbus traducidos, horario del metro, tarifas del taxi y las fuentes que se citan.
// Los horarios del metro son los oficiales de TMB (tmb.cat/en/horaris, leídos el 10/11/2026) y coinciden con
// lib/transitHours.ts, que es lo que usa la web en español. Las tarifas son las de AMB Taxi 2026.

import type { IntlLang } from "./lang"

// --- Nitbus ------------------------------------------------------------------------------------------

const ROUTE_WORDS: Record<IntlLang, { circular: string; via: string; and: string; airport: string }> = {
  en: { circular: "Circular route through the centre", via: "via", and: "and", airport: "Airport" },
  de: { circular: "Rundkurs durch das Zentrum", via: "über", and: "und", airport: "Flughafen" },
  fr: { circular: "Ligne circulaire par le centre", via: "via", and: "et", airport: "Aéroport" },
  it: { circular: "Linea circolare attraverso il centro", via: "via", and: "e", airport: "Aeroporto" },
}

/** "Barceloneta ↔ Roquetes (vía Gràcia y Canyelles)" → "... (via Gràcia and Canyelles)". Los nombres de lugar no se tocan. */
export function busRouteOf(lang: IntlLang, route: string): string {
  const w = ROUTE_WORDS[lang]
  return route
    .replace(/Circular por el centro/g, w.circular)
    .replace(/\bvía\b/g, w.via)
    .replace(/\sy\s/g, ` ${w.and} `)
    .replace(/\bAeroport\b/g, w.airport)
}

// --- Metro -------------------------------------------------------------------------------------------

export type MetroHoursRow = { when: string; hours: string }

/** Horario del metro de Barcelona (TMB). La hora de cierre es la de salida del último tren desde cada cabecera. */
const METRO_HOURS_BY_LANG: Record<IntlLang, MetroHoursRow[]> = {
  en: [
    { when: "Monday to Thursday", hours: "05:00 – 00:00" },
    { when: "Friday and the night before a public holiday", hours: "05:00 – 02:00" },
    { when: "Saturday", hours: "From 05:00, then non-stop all night" },
    { when: "Sunday", hours: "Non-stop from Saturday night until 00:00" },
  ],
  de: [
    { when: "Montag bis Donnerstag", hours: "05:00 – 00:00" },
    { when: "Freitag und Vorabend eines Feiertags", hours: "05:00 – 02:00" },
    { when: "Samstag", hours: "Ab 05:00, danach die ganze Nacht durchgehend" },
    { when: "Sonntag", hours: "Durchgehend ab der Nacht zum Sonntag bis 00:00" },
  ],
  fr: [
    { when: "Du lundi au jeudi", hours: "05:00 – 00:00" },
    { when: "Vendredi et veille de jour férié", hours: "05:00 – 02:00" },
    { when: "Samedi", hours: "Dès 05:00, puis en continu toute la nuit" },
    { when: "Dimanche", hours: "En continu depuis la nuit de samedi jusqu'à 00:00" },
  ],
  it: [
    { when: "Dal lunedì al giovedì", hours: "05:00 – 00:00" },
    { when: "Venerdì e vigilia di giorno festivo", hours: "05:00 – 02:00" },
    { when: "Sabato", hours: "Dalle 05:00, poi senza interruzione per tutta la notte" },
    { when: "Domenica", hours: "Senza interruzione dalla notte di sabato fino alle 00:00" },
  ],
}

const METRO_NOTE_BY_LANG: Record<IntlLang, string> = {
  en: "On a few special nights (Sant Joan on 23 June and New Year's Eve) the metro also runs all night. Times can change, so check TMB before a big night.",
  de: "In ein paar besonderen Nächten (Sant Joan am 23. Juni und Silvester) fährt die Metro ebenfalls die ganze Nacht. Zeiten können sich ändern, prüf also vor einer großen Nacht die Angaben von TMB.",
  fr: "Lors de quelques nuits spéciales (la Sant Joan, le 23 juin, et la Saint-Sylvestre), le métro circule aussi toute la nuit. Les horaires peuvent changer : vérifiez sur TMB avant une grande soirée.",
  it: "In alcune notti speciali (Sant Joan, il 23 giugno, e Capodanno) la metro circola anche tutta la notte. Gli orari possono cambiare: controlla TMB prima di una serata importante.",
}

export const metroHoursOf = (lang: IntlLang): MetroHoursRow[] => METRO_HOURS_BY_LANG[lang]
export const metroNoteOf = (lang: IntlLang): string => METRO_NOTE_BY_LANG[lang]

// --- Taxi --------------------------------------------------------------------------------------------

/** Tarifas urbanas del taxi de Barcelona 2026 (AMB). T-2 = noches entre semana (20:00–08:00), sábados y festivos. */
export const TAXI_2026_NUM = {
  minFare: 2.8,
  perKmDay: 1.35,
  perKmNight: 1.66,
  waitingPerHour: 27.75,
  airportSurcharge: 4.6,
  satsSurcharge: 2.55,
  fromAirportMinimum: 21,
  appBookingMinimum: 8,
  holidayEveSurcharge: 4.6,
} as const

export type TaxiFares = { -readonly [K in keyof typeof TAXI_2026_NUM]: string }

/** Un importe en euros como se escribe en cada idioma: «€2.80» en inglés, «2,80 €» en los demás. */
export function eurOf(lang: IntlLang, n: number): string {
  if (lang === "en") return `€${Number.isInteger(n) ? n : n.toFixed(2)}`
  const num = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")
  return `${num} €`
}

export function taxiFaresOf(lang: IntlLang): TaxiFares {
  const out = {} as TaxiFares
  for (const k of Object.keys(TAXI_2026_NUM) as (keyof typeof TAXI_2026_NUM)[]) out[k] = eurOf(lang, TAXI_2026_NUM[k])
  return out
}

/** Teléfonos de radiotaxi que ya usa la web en español (essentials/[category]). */
export const TAXI_PHONES = [
  { name: "Radio Taxi 033", phone: "933 033 033", tel: "933033033" },
  { name: "Fonotaxi", phone: "933 001 100", tel: "933001100" },
] as const

// --- Fuentes -----------------------------------------------------------------------------------------

export type SourceRef = { name: string; url: string }
export type Sources = { tmbHours: SourceRef; amb: SourceRef; taxiAmb: SourceRef; ordinance: SourceRef }

const SOURCE_NAMES: Record<IntlLang, { tmbHours: string; amb: string; taxiAmb: string; ordinance: string }> = {
  en: {
    tmbHours: "TMB – Operating hours",
    amb: "AMB (operator of the night bus)",
    taxiAmb: "AMB Taxi – 2026 urban fares",
    ordinance: "Ara – Key points of Barcelona's new coexistence ordinance",
  },
  de: {
    tmbHours: "TMB – Betriebszeiten",
    amb: "AMB (Betreiber des Nachtbusses)",
    taxiAmb: "AMB Taxi – Stadttarife 2026",
    ordinance: "Ara – Die wichtigsten Punkte der neuen Zusammenlebens-Verordnung Barcelonas (auf Englisch)",
  },
  fr: {
    tmbHours: "TMB – Horaires d'exploitation",
    amb: "AMB (exploitant du bus de nuit)",
    taxiAmb: "AMB Taxi – tarifs urbains 2026",
    ordinance: "Ara – Les points clés de la nouvelle ordonnance de Barcelone sur le vivre-ensemble (en anglais)",
  },
  it: {
    tmbHours: "TMB – Orari di servizio",
    amb: "AMB (gestore del bus notturno)",
    taxiAmb: "AMB Taxi – tariffe urbane 2026",
    ordinance: "Ara – I punti chiave della nuova ordinanza sulla convivenza di Barcellona (in inglese)",
  },
}

const SOURCE_URLS = {
  tmbHours: "https://www.tmb.cat/en/horaris",
  amb: "https://www.amb.cat",
  taxiAmb: "https://taxi.amb.cat/en/usuaris/tarifes-del-taxi",
  ordinance: "https://en.ara.cat/society/the-key-points-of-barcelona-s-new-coexistence-ordinance_1_5649269.html",
} as const

export function sourcesOf(lang: IntlLang): Sources {
  const n = SOURCE_NAMES[lang]
  return {
    tmbHours: { name: n.tmbHours, url: SOURCE_URLS.tmbHours },
    amb: { name: n.amb, url: SOURCE_URLS.amb },
    taxiAmb: { name: n.taxiAmb, url: SOURCE_URLS.taxiAmb },
    ordinance: { name: n.ordinance, url: SOURCE_URLS.ordinance },
  }
}
