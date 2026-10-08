// Zonas (municipios) del área de Barcelona para filtrar clubs, eventos y esenciales.
// Para el usuario, Barcelona incluye L'Hospitalet, Badalona, El Prat, etc.; "Zona" agrupa por
// municipio y "Barrio" afina dentro. Se deduce de la columna city, del barrio o de la dirección,
// sin necesitar columnas nuevas en cada tabla.

export const ZONES = [
  "Barcelona",
  "L'Hospitalet de Llobregat",
  "Badalona",
  "El Prat de Llobregat",
  "Cornellà de Llobregat",
  "Sant Adrià de Besòs",
  "Santa Coloma de Gramenet",
  "Esplugues de Llobregat",
] as const

const NAME_PATTERNS: [RegExp, string][] = [
  [/hospitalet/i, "L'Hospitalet de Llobregat"],
  [/badalona/i, "Badalona"],
  [/\bprat\b/i, "El Prat de Llobregat"],
  [/corn[eè]ll/i, "Cornellà de Llobregat"],
  [/sant adri/i, "Sant Adrià de Besòs"],
  [/santa coloma/i, "Santa Coloma de Gramenet"],
  [/esplugues/i, "Esplugues de Llobregat"],
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
  if (/^0892[1-4]$/.test(pc)) return "Santa Coloma de Gramenet"
  return null
}

export function zoneOf(item: { city?: string | null; neighborhood?: string | null; address?: string | null }): string {
  for (const field of [item.city, item.neighborhood]) {
    if (!field) continue
    for (const [rx, zone] of NAME_PATTERNS) if (rx.test(field)) return zone
  }
  if (item.address) {
    const byPostcode = fromPostcode(item.address)
    if (byPostcode) return byPostcode
    // Nombre del municipio al final de la dirección (", Badalona"), no en el nombre de la calle.
    const tail = item.address.split(",").slice(-2).join(",")
    for (const [rx, zone] of NAME_PATTERNS) if (rx.test(tail)) return zone
  }
  return "Barcelona"
}

export function zonesPresent(items: { city?: string | null; neighborhood?: string | null; address?: string | null }[]): string[] {
  const counts = new Map<string, number>()
  for (const it of items) {
    const z = zoneOf(it)
    counts.set(z, (counts.get(z) || 0) + 1)
  }
  return ZONES.filter((z) => (counts.get(z) || 0) > 0)
}
