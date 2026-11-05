// Categorías de la agenda de Eventos (04/11/2026): Conciertos · Festivales · Fiestas de barrio.
//
// La tabla `events` no tiene una columna de categoría, así que se deduce del título. Las fiestas de
// barrio son solo las PRINCIPALES de Barcelona (las de la lista de abajo); cualquier otra «fiesta
// mayor» de la tabla no se enseña (no se borra de la base de datos: basta con añadir su barrio a la
// lista para que vuelva a salir).

export type EventCategory = "concert" | "festival" | "neighborhood"

export const EVENT_CATEGORIES: EventCategory[] = ["concert", "festival", "neighborhood"]

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()

// Barrios de Barcelona cuya fiesta mayor se considera principal. Cada entrada: nombre para mostrar y
// las formas en que puede aparecer en un título (sin tildes, en minúsculas).
export const MAIN_BARRIO_FESTES: { name: string; match: string[] }[] = [
  { name: "Gràcia", match: ["gracia"] },
  { name: "Sants", match: ["sants"] },
  { name: "Sant Andreu", match: ["sant andreu"] },
  { name: "Poble-sec", match: ["poble sec"] },
  { name: "Sagrada Família", match: ["sagrada familia"] },
  { name: "El Carmel", match: ["carmel"] },
  { name: "El Coll", match: ["el coll", "del coll"] },
  { name: "Horta", match: ["horta"] },
  { name: "El Clot", match: ["el clot", "del clot"] },
  { name: "Poblenou", match: ["poblenou", "poble nou"] },
  { name: "La Barceloneta", match: ["barceloneta"] },
  { name: "Sant Antoni", match: ["sant antoni"] },
  { name: "El Raval", match: ["raval"] },
  { name: "Sarrià", match: ["sarria"] },
  { name: "Les Corts", match: ["les corts"] },
  { name: "Hostafrancs", match: ["hostafrancs"] },
  { name: "La Sagrera", match: ["sagrera"] },
  { name: "El Guinardó", match: ["guinardo"] },
  { name: "La Mercè", match: ["la merce"] },
]

const FESTA_PATTERN = /\b(festa|festes|fiesta|fiestas)\b.*\b(major|majors|mayor|mayores|barri|barrio)\b|\bfm\b|\bfestes (de|del|dels)\b|\bfiestas (de|del)\b|\bla merce\b/

const FESTIVAL_WORDS = ["festival", "primavera sound", "sonar", "cruilla", "mira", "grec", "bam"]

// Devuelve la categoría y, si es fiesta de barrio, el barrio principal al que pertenece (o null si es
// una fiesta mayor de un barrio que no está en la lista: esas no se enseñan).
export function classifyEvent(event: { title?: string | null; address?: string | null }): { category: EventCategory; barrio: string | null; hidden: boolean } {
  const title = norm(event.title || "")
  if (FESTA_PATTERN.test(title)) {
    const hit = MAIN_BARRIO_FESTES.find((b) => b.match.some((m) => title.includes(m)))
    if (hit) return { category: "neighborhood", barrio: hit.name, hidden: false }
    // «Fiesta mayor» / «FM» de un barrio que no está en la lista: no se enseña. Otras «fiestas de…»
    // (Nadal, etc.) no son fiestas de barrio: salen como un evento normal.
    if (/\b(major|majors|mayor|mayores)\b|\bfm\b/.test(title)) return { category: "neighborhood", barrio: null, hidden: true }
  }
  if (FESTIVAL_WORDS.some((w) => new RegExp(`\\b${w}`).test(title))) return { category: "festival", barrio: null, hidden: false }
  return { category: "concert", barrio: null, hidden: false }
}
