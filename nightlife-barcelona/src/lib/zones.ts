// Zonas (municipios) del área de Barcelona para filtrar clubs, eventos y esenciales.
// Para el usuario, Barcelona incluye L'Hospitalet, Badalona, El Prat, etc.; "Zona" agrupa por
// municipio y "Barrio" afina dentro. Se deduce de la columna city, del barrio o de la dirección,
// sin necesitar columnas nuevas en cada tabla.
// Madrid (14/11/2026) es una zona más, sin página propia todavía (ver ZONE_PAGES en zonePages.ts): sus locales siguen ocultos hasta el
// lanzamiento y, con ella, dejan de caer en «Barcelona» por defecto. Sus barrios populares salen de lib/madridZones.ts.

import { cityOfClub } from "./cities"

export const ZONES = [
  "Barcelona",
  "L'Hospitalet de Llobregat",
  "Badalona",
  "El Prat de Llobregat",
  "Cornellà de Llobregat",
  "Sant Adrià de Besòs",
  "Santa Coloma de Gramenet",
  "Esplugues de Llobregat",
  "Sant Feliu de Llobregat",
  "Sant Boi de Llobregat",
  "Madrid",
] as const

const NAME_PATTERNS: [RegExp, string][] = [
  [/hospitalet/i, "L'Hospitalet de Llobregat"],
  [/badalona/i, "Badalona"],
  [/\bprat\b/i, "El Prat de Llobregat"],
  [/corn[eè]ll/i, "Cornellà de Llobregat"],
  [/sant adri/i, "Sant Adrià de Besòs"],
  [/santa coloma/i, "Santa Coloma de Gramenet"],
  [/esplugues/i, "Esplugues de Llobregat"],
  [/sant feliu de llobregat|sant feliu\b(?!\s+de\s+(?:codines|gu[ií]xols))/i, "Sant Feliu de Llobregat"],
  [/sant boi/i, "Sant Boi de Llobregat"],
]

function fromPostcode(text: string): string | null {
  const m = text.match(/\b(08\d{3})\b/)
  if (!m) return null
  const pc = m[1]
  if (pc === "08820") return "El Prat de Llobregat"
  if (/^0890[1-8]$/.test(pc)) return "L'Hospitalet de Llobregat"
  if (/^0891\d$/.test(pc)) return "Badalona"
  if (pc === "08930") return "Sant Adrià de Besòs"
  if (pc === "08940") return "Cornellà de Llobregat"
  if (pc === "08950") return "Esplugues de Llobregat"
  if (pc === "08980") return "Sant Feliu de Llobregat"
  if (pc === "08830") return "Sant Boi de Llobregat"
  if (/^0892[1-4]$/.test(pc)) return "Santa Coloma de Gramenet"
  return null
}

// Códigos postales del municipio de Madrid (28001–28055). El resto de 28xxx son otros municipios de la Comunidad.
const MADRID_POSTCODE = /^280(?:0[1-9]|[1-4]\d|5[0-5])$/

function isMadridAddress(address: string): boolean {
  const m = address.match(/\b(28\d{3})\b/)
  if (m && MADRID_POSTCODE.test(m[1])) return true
  // «Madrid» como último trozo de la dirección (", Madrid"), no como parte del nombre de la calle.
  const last = address.split(",").pop() || ""
  return /^\s*(?:28\d{3}\s+)?madrid\s*$/i.test(last)
}

type ZoneItem = {
  city?: string | null
  neighborhood?: string | null
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

export function zoneOf(item: ZoneItem): string {
  // Madrid primero: su ciudad (o sus coordenadas) no se parece a nada del área de Barcelona. «Madrid» como barrio es lo que
  // guarda el importador de OpenStreetMap cuando no hay barrio.
  if (cityOfClub(item) === "madrid" || /^\s*madrid\s*$/i.test(item.neighborhood || "")) return "Madrid"
  for (const field of [item.city, item.neighborhood]) {
    if (!field) continue
    for (const [rx, zone] of NAME_PATTERNS) if (rx.test(field)) return zone
  }
  if (item.address) {
    if (isMadridAddress(item.address)) return "Madrid"
    const byPostcode = fromPostcode(item.address)
    if (byPostcode) return byPostcode
    // Nombre del municipio al final de la dirección (", Badalona"), no en el nombre de la calle.
    const tail = item.address.split(",").slice(-2).join(",")
    for (const [rx, zone] of NAME_PATTERNS) if (rx.test(tail)) return zone
  }
  return "Barcelona"
}

export function zonesPresent(items: ZoneItem[]): string[] {
  const counts = new Map<string, number>()
  for (const it of items) {
    const z = zoneOf(it)
    counts.set(z, (counts.get(z) || 0) + 1)
  }
  return ZONES.filter((z) => (counts.get(z) || 0) > 0)
}
