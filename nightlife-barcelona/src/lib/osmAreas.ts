// Piezas que comparten los importadores de OpenStreetMap (locales y esenciales): los municipios
// que se pueden importar, cómo se normaliza un nombre para detectar duplicados, la distancia entre
// dos puntos y a qué municipio pertenece un elemento según sus etiquetas.

// Los nombres van como alternativas literales entre paréntesis: Overpass las busca por índice y
// responde en segundos; una expresión con clases de caracteres ([Ll], [^a-z]…) le obliga a recorrer
// todos los nombres del planeta y la consulta se agota.
export const AREAS: Record<string, { osmPattern: string; city: string }> = {
  barcelona: { osmPattern: "Barcelona", city: "Barcelona" },
  hospitalet: { osmPattern: "(l'Hospitalet de Llobregat|L'Hospitalet de Llobregat|l’Hospitalet de Llobregat|L’Hospitalet de Llobregat|Hospitalet de Llobregat)", city: "L'Hospitalet de Llobregat" },
  badalona: { osmPattern: "Badalona", city: "Badalona" },
  elprat: { osmPattern: "(el Prat de Llobregat|El Prat de Llobregat)", city: "El Prat de Llobregat" },
  santacoloma: { osmPattern: "Santa Coloma de Gramenet", city: "Santa Coloma de Gramenet" },
  cornella: { osmPattern: "(Cornellà de Llobregat|Cornella de Llobregat)", city: "Cornellà de Llobregat" },
  santadria: { osmPattern: "(Sant Adrià de Besòs|Sant Adria de Besos|Sant Adrià del Besòs)", city: "Sant Adrià de Besòs" },
  esplugues: { osmPattern: "Esplugues de Llobregat", city: "Esplugues de Llobregat" },
  santfeliu: { osmPattern: "Sant Feliu de Llobregat", city: "Sant Feliu de Llobregat" },
  santboi: { osmPattern: "Sant Boi de Llobregat", city: "Sant Boi de Llobregat" },
}

const STOP_WORDS = ["bar", "pub", "club", "discoteca", "cafe", "restaurant", "restaurante", "bcn", "barcelona", "the", "el", "la", "los", "las", "de", "del", "i", "y", "and"]

export function normalize(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
  const words = base.split(/\s+/).filter((w) => w && !STOP_WORDS.includes(w))
  return (words.length ? words : base.split(/\s+/).filter(Boolean)).join("")
}

export function meters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const rad = (v: number) => (v * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}


// Municipio real del local (la cuadrícula de Barcelona también recoge locales de municipios vecinos).
export function cityFor(tags: Record<string, string>, fallback: string): string {
  const raw = (tags["addr:city"] || "").trim()
  if (raw) {
    if (/^barcelona$/i.test(raw)) return "Barcelona"
    if (/hospitalet/i.test(raw)) return "L'Hospitalet de Llobregat"
    if (/prat/i.test(raw)) return "El Prat de Llobregat"
    if (/badalona/i.test(raw)) return "Badalona"
    if (/corn[eè]ll/i.test(raw)) return "Cornellà de Llobregat"
    if (/adri/i.test(raw)) return "Sant Adrià de Besòs"
    if (/esplugues/i.test(raw)) return "Esplugues de Llobregat"
    if (/santa coloma/i.test(raw)) return "Santa Coloma de Gramenet"
    if (/sant feliu de llobregat|sant feliu\b(?!\s+de\s+(?:codines|gu[ií]xols))/i.test(raw)) return "Sant Feliu de Llobregat"
    if (/sant boi/i.test(raw)) return "Sant Boi de Llobregat"
    return raw.slice(0, 60)
  }
  const pc = (tags["addr:postcode"] || "").trim()
  if (/^08820/.test(pc)) return "El Prat de Llobregat"
  if (/^0890[1-8]/.test(pc)) return "L'Hospitalet de Llobregat"
  if (/^0891\d/.test(pc)) return "Badalona"
  if (/^08930/.test(pc)) return "Sant Adrià de Besòs"
  if (/^08940/.test(pc)) return "Cornellà de Llobregat"
  if (/^08950/.test(pc)) return "Esplugues de Llobregat"
  if (/^0892[1-4]/.test(pc)) return "Santa Coloma de Gramenet"
  if (/^08980/.test(pc)) return "Sant Feliu de Llobregat"
  if (/^08830/.test(pc)) return "Sant Boi de Llobregat"
  return fallback
}

