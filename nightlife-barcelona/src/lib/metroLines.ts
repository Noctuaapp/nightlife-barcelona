import { METRO_STATIONS } from "./metroStations"
import type { NbDirection, NbLine, NbStop } from "./nitbusRoutes"

// Estaciones del metro, línea por línea y EN ORDEN (06/11/2026).
//
// Sirve para lo mismo que el recorrido del Nitbus: entrar en una línea, ver sus estaciones de punta a
// punta y elegir «Subo en» / «Bajo en» para ver solo ese tramo. Reutiliza los tipos y las funciones del
// Nitbus (nitbusRoutes.ts), así que la página de una línea de metro y la de una línea de Nitbus se
// comportan igual.
//
// De dónde sale el orden: de los artículos de Wikipedia en inglés de cada línea («Barcelona Metro line N»),
// leídos el 06/11/2026. No se ha inventado ni deducido ninguno: se cruzó con `metroStations.ts` y con las
// líneas de cada estación (los tests lo comprueban en los dos sentidos), y eso sirvió para corregir dos
// líneas mal puestas allí (Tarragona y La Sagrera).
//
// Las líneas L9 y L10 son dos tramos separados que hoy no se tocan (el central aún no está abierto), así
// que cada una tiene sus dos tramos (Nord y Sud). L6, L7, L8 y L12 son de FGC, no de TMB.
//
// Los nombres son los de `metroStations.ts` (los mismos que ve la persona en la lista de estaciones). Tres
// estaciones (METRO_EXTRA) no están en esa lista y van sin coordenadas: no se inventan; solo se pierde el
// botón «Cómo llegar andando» y su distancia.

type MetroSection = { name?: string; stations: string[] }

// L1 < L2 < … < L12 (el código sin la «L»). Aquí y no importado de nitbusRoutes para que este módulo no
// arrastre el cliente de Supabase.
const compareLineCodes = (a: string, b: string) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""))

export const METRO_LINE_SECTIONS: Record<string, MetroSection[]> = {
  L1: [
    { stations: [
      "Hospital de Bellvitge", "Bellvitge Rambla Marina", "Avinguda Carrilet", "Rambla Just Oliveras",
      "Can Serra", "Florida", "Torrassa", "Santa Eulàlia",
      "Mercat Nou", "Plaça de Sants", "Hostafrancs", "Espanya",
      "Rocafort", "Urgell", "Universitat", "Catalunya",
      "Urquinaona", "Arc de Triomf", "Marina", "Glòries",
      "El Clot", "Navas", "La Sagrera", "Fabra i Puig",
      "Sant Andreu", "Torras i Bages", "Trinitat Vella", "Baró de Viver",
      "Santa Coloma", "Fondo",
    ] },
  ],
  L2: [
    { stations: [
      "Paral·lel", "Sant Antoni", "Universitat", "Passeig de Gràcia",
      "Tetuan", "Monumental", "Sagrada Família", "Encants",
      "El Clot", "Bac de Roda", "Sant Martí", "La Pau",
      "Verneda", "Artigues | Sant Adrià", "Sant Roc", "Gorg",
      "Pep Ventura", "Badalona Pompeu Fabra",
    ] },
  ],
  L3: [
    { stations: [
      "Zona Universitària", "Palau Reial", "Maria Cristina", "les Corts",
      "Plaça del Centre", "Sants Estació", "Tarragona", "Espanya",
      "El Poble-sec", "Paral·lel", "Drassanes", "Liceu",
      "Catalunya", "Passeig de Gràcia", "Diagonal", "Fontana",
      "Lesseps", "Vallcarca", "Penitents", "Vall d'Hebron | Sant Genís",
      "Montbau", "Mundet", "Valldaura", "Canyelles",
      "Roquetes", "Trinitat Nova",
    ] },
  ],
  L4: [
    { stations: [
      "La Pau", "Besòs", "Besòs Mar", "El Maresme | Fòrum",
      "Selva de Mar", "Poblenou", "Llacuna", "Bogatell",
      "Ciutadella | Vila Olímpica", "Barceloneta", "Jaume I", "Urquinaona",
      "Passeig de Gràcia", "Girona", "Verdaguer", "Joanic",
      "Alfons X", "Guinardó | Hospital de Sant Pau", "Maragall", "Llucmajor | República",
      "Via Júlia", "Trinitat Nova",
    ] },
  ],
  L5: [
    { stations: [
      "Cornellà Centre", "Gavarra", "Sant Ildefons", "Can Boixeres",
      "Can Vidalet", "Pubilla Cases", "Ernest Lluch", "Collblanc",
      "Badal", "Plaça de Sants", "Sants Estació", "Entença",
      "Hospital Clínic", "Diagonal", "Verdaguer", "Sagrada Família",
      "Sant Pau | Dos de Maig", "Camp de l'Arpa", "La Sagrera", "Congrés | Indians",
      "Maragall", "Virrei Amat", "Vilapicina", "Horta",
      "el Carmel", "El Coll | La Teixonera", "Vall d'Hebron | Sant Genís",
    ] },
  ],
  L6: [
    { stations: [
      "Catalunya", "Provença", "Gràcia", "Sant Gervasi",
      "Muntaner", "La Bonanova", "Les Tres Torres", "Sarrià",
    ] },
  ],
  L7: [
    { stations: [
      "Catalunya", "Provença", "Gràcia", "Plaça Molina",
      "Pàdua", "El Putxet", "Avinguda Tibidabo",
    ] },
  ],
  L8: [
    { stations: [
      "Espanya", "Magòria-La Campana", "Ildefons Cerdà", "Europa | Fira",
      "Gornal", "Sant Josep", "Avinguda Carrilet", "Almeda",
      "Cornellà-Riera", "Sant Boi", "Molí Nou-Ciutat Cooperativa",
    ] },
  ],
  L9: [
    { name: "Nord", stations: [
      "La Sagrera", "Onze de Setembre", "Bon Pastor", "Can Peixauet",
      "Santa Rosa", "Fondo", "Església Major", "Singuerlín",
      "Can Zam",
    ] },
    { name: "Sud", stations: [
      "Zona Universitària", "Collblanc", "Torrassa", "Can Tries - Gornal",
      "Europa | Fira", "Fira", "Parc Logístic", "Mercabarna",
      "Les Moreres", "El Prat Estació", "Cèntric", "Parc Nou",
      "Mas Blau", "Aeroport T2", "Aeroport T1",
    ] },
  ],
  L10: [
    { name: "Nord", stations: [
      "La Sagrera", "Onze de Setembre", "Bon Pastor", "Llefià",
      "la Salut", "Gorg",
    ] },
    { name: "Sud", stations: [
      "Collblanc", "Torrassa", "Can Tries - Gornal", "Provençana",
      "Ciutat de la Justícia", "Foneria", "Foc", "Zona Franca",
      "Port Comercial | La Factoria", "Ecoparc", "ZAL | Riu Vell",
    ] },
  ],
  L11: [
    { stations: [
      "Trinitat Nova", "Casa de l'Aigua", "Torre Baró | Vallbona", "Ciutat Meridiana",
      "Can Cuiàs",
    ] },
  ],
  L12: [
    { stations: [
      "Sarrià", "Reina Elisenda",
    ] },
  ],
}

// Estaciones reales de estas líneas que `metroStations.ts` no tiene todavía.
export const METRO_EXTRA = ["Magòria-La Campana", "Sant Boi", "Molí Nou-Ciutat Cooperativa"]

export const METRO_LINE_CODES: string[] = Object.keys(METRO_LINE_SECTIONS).sort(compareLineCodes)

export function isMetroLine(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(METRO_LINE_SECTIONS, code.toUpperCase())
}

const BY_NAME = new Map(METRO_STATIONS.map((s) => [s.name, s]))

function stopOf(name: string, code: string): NbStop {
  const st = BY_NAME.get(name)
  const others = (st?.lines ?? []).filter((l) => l !== code).sort(compareLineCodes)
  return { name, lat: st?.lat ?? null, lon: st?.lon ?? null, others }
}

const cache = new Map<string, NbLine>()

// La línea como la espera la vista del Nitbus: dos sentidos por tramo, cada uno con sus estaciones en
// orden. null si el código no existe.
export function buildMetroLine(rawCode: string): NbLine | null {
  const code = rawCode.toUpperCase()
  if (!isMetroLine(code)) return null
  const hit = cache.get(code)
  if (hit) return hit
  const directions: NbDirection[] = []
  const sections: NonNullable<NbLine["sections"]> = []
  const names = new Set<string>()
  for (const sec of METRO_LINE_SECTIONS[code]) {
    const fwd = sec.stations.map((n) => stopOf(n, code))
    for (const n of sec.stations) names.add(n)
    const first = directions.length
    directions.push({ from: sec.stations[0], to: sec.stations[sec.stations.length - 1], stops: fwd })
    directions.push({ from: sec.stations[sec.stations.length - 1], to: sec.stations[0], stops: [...fwd].reverse() })
    sections.push({ name: sec.name ?? "", dirs: [first, first + 1], stopCount: sec.stations.length })
  }
  const line: NbLine = { code, ordered: true, directions, stopCount: names.size }
  // Solo las líneas con varios tramos con nombre (L9 y L10) llevan selector de tramo.
  if (sections.length > 1 && sections.every((x) => x.name)) line.sections = sections
  cache.set(code, line)
  return line
}

// «Hospital de Bellvitge ↔ Fondo»; en las líneas con dos tramos, «Nord: … · Sud: …».
export function metroLineSummary(code: string): string {
  const secs = METRO_LINE_SECTIONS[code.toUpperCase()] ?? []
  return secs
    .map((s) => `${secs.length > 1 && s.name ? `${s.name}: ` : ""}${s.stations[0]} ↔ ${s.stations[s.stations.length - 1]}`)
    .join(" · ")
}
