// Qué esenciales importa Noctua desde OpenStreetMap y cuáles se quedan fuera. Lo usa el importador
// (/api/admin/import-osm-essentials). Está aparte para poder probarlo sin llamar a OpenStreetMap.
//
// Criterio de Noctua: sitios útiles de noche, es decir, abiertos las 24 h o que cierran a la
// 1:00 o más tarde. Un sitio sin horario en OpenStreetMap no entra (no se puede saber), salvo cajeros de calle
// y hospitales con urgencias, que son 24 h por naturaleza.
// Parkings (2/11/2026): aparte, y solo los públicos y gratuitos (fee=no, sin acceso restringido).
// No tienen horario que mirar y no entran en «all» para no mezclarlos con los esenciales de noche.

import { meters, normalize } from "./osmAreas"
import { isNightEssentialHours, parseOsmHours, toNoctuaHours, type WeekHours } from "./osmHours"

export type EssentialKey = "pharmacy" | "atm" | "food" | "supermarket" | "gas" | "hospital" | "parking"

export type EssentialType = {
  key: EssentialKey
  category: string // valor de la columna essentials.category
  label: string
  selectors: string[] // filtros de Overpass (sin el `nwr(area)` inicial)
  needsHours: boolean // sin horario en OpenStreetMap no se puede saber si es de noche
}

export const ESSENTIAL_TYPES: EssentialType[] = [
  { key: "pharmacy", category: "Pharmacy", label: "Farmacias", needsHours: true, selectors: [`["amenity"="pharmacy"]["opening_hours"]`] },
  { key: "atm", category: "ATM", label: "Cajeros", needsHours: false, selectors: [`["amenity"="atm"]`] },
  { key: "food", category: "Food", label: "Comida", needsHours: true, selectors: [`["amenity"~"^(fast_food|restaurant|cafe|food_court)$"]["name"]["opening_hours"]`] },
  { key: "supermarket", category: "Supermarket", label: "Supermercados", needsHours: true, selectors: [`["shop"~"^(supermarket|convenience)$"]["opening_hours"]`] },
  { key: "gas", category: "Gas Station", label: "Gasolineras", needsHours: true, selectors: [`["amenity"="fuel"]["opening_hours"]`] },
  { key: "hospital", category: "Hospital", label: "Hospitales", needsHours: false, selectors: [`["amenity"="hospital"]`] },
  // Solo los que OpenStreetMap marca expresamente como gratuitos (fee=no): sin etiqueta no se sabe, y
  // aquí es peor enseñar uno de pago como gratis que perder uno.
  { key: "parking", category: "Parking", label: "Parkings gratuitos", needsHours: false, selectors: [`["amenity"="parking"]["fee"="no"]`] },
]

export function typesFor(cat: string): EssentialType[] {
  if (!cat || cat === "all") return ESSENTIAL_TYPES.filter((x) => x.key !== "parking")
  const t = ESSENTIAL_TYPES.find((x) => x.key === cat)
  return t ? [t] : []
}

export type Verdict =
  | { ok: true; name: string; openHours: string | null }
  | { ok: false; reason: "sin_nombre" | "sin_horario" | "horario_no_entendido" | "no_es_de_noche" | "no_es_publico" | "no_es_gratis" | "no_es_para_coches" }

const RESTRICTED_ACCESS = new Set(["private", "customers", "no", "permit"])
// Parkings: además, los que son solo para vecinos, empleados, alumnos, socios, reparto…
const PARKING_RESTRICTED_ACCESS = new Set([...RESTRICTED_ACCESS, "delivery", "residents", "employees", "staff", "students", "members", "military", "agricultural", "forestry", "emergency"])
// Nombres que delatan un parking que no es de uso general («Parking privado», «solo clientes»…).
const PARKING_PRIVATE_NAME = /privad|privat|client|customer|residen|reservad|exclusiv|empleado|treballador|\bstaff\b|abonad|socio/i

// Nombre que se mostrará: el del local, o la marca/operador (en cajeros: «CaixaBank», «Euronet»).
export function essentialName(tags: Record<string, string>): string | null {
  const n = (tags.name || tags.brand || tags.operator || "").replace(/\s+/g, " ").trim()
  return n ? n.slice(0, 120) : null
}

// Parking público y gratuito: fee=no explícito, acceso general, para coches y con nombre que no sea de
// uso reservado. Si no tiene nombre se llama «Aparcamiento gratuito» (+ la calle si OpenStreetMap la sabe):
// no se usa la marca ni el operador, porque «Ajuntament de Barcelona» no dice nada de un parking.
function judgeParking(tags: Record<string, string>): Verdict {
  if ((tags.fee || "").toLowerCase() !== "no") return { ok: false, reason: "no_es_gratis" }
  if (PARKING_RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }
  if (["no", "private"].includes((tags.motorcar || "").toLowerCase()) || ["no", "private"].includes((tags.motor_vehicle || "").toLowerCase())) {
    return { ok: false, reason: "no_es_para_coches" }
  }
  const named = (tags.name || "").replace(/\s+/g, " ").trim()
  if (PARKING_PRIVATE_NAME.test(named)) return { ok: false, reason: "no_es_publico" }
  const street = (tags["addr:street"] || "").replace(/\s+/g, " ").trim()
  const name = (named || (street ? `Aparcamiento gratuito · ${street}` : "Aparcamiento gratuito")).slice(0, 120)
  return { ok: true, name, openHours: null }
}

export function judgeEssential(type: EssentialType, tags: Record<string, string>): Verdict {
  if (type.key === "parking") return judgeParking(tags)
  const name = essentialName(tags) ?? (type.key === "atm" ? "Cajero automático" : null)
  if (!name) return { ok: false, reason: "sin_nombre" }
  if (RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }

  const rawHours = (tags.opening_hours || "").trim()
  let week: WeekHours | null = null
  if (rawHours) {
    week = parseOsmHours(rawHours)
    if (!week) return { ok: false, reason: "horario_no_entendido" }
    if (!isNightEssentialHours(week)) return { ok: false, reason: "no_es_de_noche" }
    return { ok: true, name, openHours: toNoctuaHours(week) }
  }

  // Sin horario en OpenStreetMap:
  if (type.key === "atm") {
    // Un cajero de calle suele estar siempre accesible; uno dentro de una oficina o un centro, no.
    if ((tags.indoor || "").toLowerCase() === "yes") return { ok: false, reason: "sin_horario" }
    return { ok: true, name, openHours: null }
  }
  if (type.key === "hospital") {
    return tags.emergency === "yes" ? { ok: true, name, openHours: null } : { ok: false, reason: "sin_horario" }
  }
  return { ok: false, reason: "sin_horario" }
}

export type ExistingEssential = { category: string; norm: string; lat: number | null; lon: number | null }

// Mismo sitio si es de la misma categoría y está a menos de 15 m, o a menos de 150 m con el mismo
// nombre (así dos Mercadona de calles distintas no se confunden).
export function isDuplicateEssential(existing: ExistingEssential[], cand: { category: string; name: string; lat: number; lon: number }): boolean {
  const norm = normalize(cand.name)
  return existing.some((e) => {
    if (e.category !== cand.category || e.lat == null || e.lon == null) return false
    const d = meters(cand.lat, cand.lon, e.lat, e.lon)
    if (d < 15) return true
    if (d >= 150 || !e.norm || !norm) return false
    return e.norm === norm || (e.norm.length >= 5 && norm.includes(e.norm)) || (norm.length >= 5 && e.norm.includes(norm))
  })
}

export function essentialAddress(tags: Record<string, string>, city: string): string | null {
  const street = tags["addr:street"]
  if (!street) return null
  return [street + (tags["addr:housenumber"] ? ", " + tags["addr:housenumber"] : ""), tags["addr:postcode"], city].filter(Boolean).join(", ")
}

// A qué tipo de esencial pertenece un elemento de OpenStreetMap, según sus etiquetas.
export function osmMatches(key: EssentialKey, tags: Record<string, string>): boolean {
  switch (key) {
    case "pharmacy": return tags.amenity === "pharmacy"
    case "atm": return tags.amenity === "atm"
    case "food": return ["fast_food", "restaurant", "cafe", "food_court"].includes(tags.amenity)
    case "supermarket": return tags.shop === "supermarket" || tags.shop === "convenience"
    case "gas": return tags.amenity === "fuel"
    case "hospital": return tags.amenity === "hospital"
    case "parking": return tags.amenity === "parking"
  }
}
