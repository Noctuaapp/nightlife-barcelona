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

export type EssentialKey =
  | "pharmacy" | "atm" | "food" | "supermarket" | "gas" | "hospital" | "parking"
  | "taxi" | "veterinary" | "toilets" | "vending" | "luggage" | "police" | "bicing"

export type EssentialType = {
  key: EssentialKey
  category: string // valor de la columna essentials.category
  label: string
  selectors: string[] // filtros de Overpass (sin el `nwr(area)` inicial)
  needsHours: boolean // sin horario en OpenStreetMap no se puede saber si es de noche
  inAll: boolean // entra en «Todas las categorías». Las nuevas (5/11/2026) se piden de una en una
}

export const ESSENTIAL_TYPES: EssentialType[] = [
  { key: "pharmacy", category: "Pharmacy", label: "Farmacias", needsHours: true, inAll: true, selectors: [`["amenity"="pharmacy"]["opening_hours"]`] },
  { key: "atm", category: "ATM", label: "Cajeros", needsHours: false, inAll: true, selectors: [`["amenity"="atm"]`] },
  { key: "food", category: "Food", label: "Comida", needsHours: true, inAll: true, selectors: [`["amenity"~"^(fast_food|restaurant|cafe|food_court)$"]["name"]["opening_hours"]`] },
  { key: "supermarket", category: "Supermarket", label: "Supermercados", needsHours: true, inAll: true, selectors: [`["shop"~"^(supermarket|convenience)$"]["opening_hours"]`] },
  { key: "gas", category: "Gas Station", label: "Gasolineras", needsHours: true, inAll: true, selectors: [`["amenity"="fuel"]["opening_hours"]`] },
  { key: "hospital", category: "Hospital", label: "Hospitales", needsHours: false, inAll: true, selectors: [`["amenity"="hospital"]`] },
  // Solo los que OpenStreetMap marca expresamente como gratuitos (fee=no): sin etiqueta no se sabe, y
  // aquí es peor enseñar uno de pago como gratis que perder uno.
  { key: "parking", category: "Parking", label: "Parkings gratuitos", needsHours: false, inAll: false, selectors: [`["amenity"="parking"]["fee"="no"]`] },

  // Categorías nuevas (5/11/2026). Entran siempre ocultas y sin verificar: el horario de OpenStreetMap
  // sirve para orientar, no para fiarse de él a las 4:00 (por eso Noctua las marca «sin confirmar»
  // hasta que alguien las verifica en Admin › Esenciales).
  // Paradas de taxi (amenity=taxi): son paradas, no oficinas de Uber o Cabify.
  { key: "taxi", category: "Taxi", label: "Paradas de taxi", needsHours: false, inAll: false, selectors: [`["amenity"="taxi"]`] },
  // Veterinarios: solo los que OpenStreetMap da como urgencias (emergency=yes) o abiertos de noche.
  { key: "veterinary", category: "Veterinary", label: "Veterinarios de urgencias", needsHours: false, inAll: false, selectors: [`["amenity"="veterinary"]`] },
  { key: "toilets", category: "Toilets", label: "Aseos públicos", needsHours: false, inAll: false, selectors: [`["amenity"="toilets"]`] },
  // Máquinas expendedoras de comida, bebida, café, higiene o electrónica; no de billetes ni de tabaco.
  { key: "vending", category: "Vending", label: "Máquinas expendedoras", needsHours: false, inAll: false, selectors: [`["amenity"="vending_machine"]`] },
  { key: "luggage", category: "Luggage", label: "Consignas", needsHours: false, inAll: false, selectors: [`["amenity"~"^(luggage_locker|left_luggage)$"]`] },
  { key: "police", category: "Police", label: "Comisarías y policía", needsHours: false, inAll: false, selectors: [`["amenity"="police"]`] },
  // Estaciones de Bicing. Solo la ubicación: las bicis y huecos libres en directo no se enseñan todavía.
  { key: "bicing", category: "Bicing", label: "Estaciones de Bicing", needsHours: false, inAll: false, selectors: [`["amenity"="bicycle_rental"]["network"~"bicing",i]`, `["amenity"="bicycle_rental"]["operator"~"bicing",i]`] },
]

export function typesFor(cat: string): EssentialType[] {
  if (!cat || cat === "all") return ESSENTIAL_TYPES.filter((x) => x.inAll)
  const t = ESSENTIAL_TYPES.find((x) => x.key === cat)
  return t ? [t] : []
}

export type Verdict =
  | { ok: true; name: string; openHours: string | null; subcategory?: string | null; attrs?: Record<string, unknown> }
  | { ok: false; reason: "sin_nombre" | "sin_horario" | "horario_no_entendido" | "no_es_de_noche" | "no_es_publico" | "no_es_gratis" | "no_es_para_coches" | "no_es_una_parada" | "producto_no_util" | "no_es_comisaria" }

const RESTRICTED_ACCESS = new Set(["private", "customers", "no", "permit"])
// Parkings: además, los que son solo para vecinos, empleados, alumnos, socios, reparto…
const PARKING_RESTRICTED_ACCESS = new Set([...RESTRICTED_ACCESS, "delivery", "residents", "employees", "staff", "students", "members", "military", "agricultural", "forestry", "emergency"])
// Nombres que delatan un parking que no es de uso general («Parking privado», «solo clientes»…).
const PARKING_PRIVATE_NAME = /privad|privat|client|customer|residen|reservad|exclusiv|empleado|treballador|\bstaff\b|abonad|socio/i
// Aparcamientos de camiones o autobuses: son públicos y gratis, pero no son para un coche.
const PARKING_NOT_FOR_CARS_NAME = /truck|camion|camió|lorry|\bhgv\b|autocar|autob[uú]s|\bbus\b/i

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
  if (["designated", "only"].includes((tags.hgv || "").toLowerCase()) || PARKING_NOT_FOR_CARS_NAME.test(named)) {
    return { ok: false, reason: "no_es_para_coches" }
  }
  const street = (tags["addr:street"] || "").replace(/\s+/g, " ").trim()
  const name = (named || (street ? `Aparcamiento gratuito · ${street}` : "Aparcamiento gratuito")).slice(0, 120)
  return { ok: true, name, openHours: null }
}

// ---------------------------------------------------------------------------------------------
// Categorías nuevas (5/11/2026). Aquí no se pide ser «de noche» salvo en veterinarios: un aseo, una
// consigna o una máquina con un horario de día se guardan con ese horario y la web ya dice si ahora
// están abiertos. Un horario que no se entiende se deja vacío («sin confirmar»), nunca se inventa.
// ---------------------------------------------------------------------------------------------

const NOT_A_RANK = /cabify|uber|bolt|free\s?now|oficina|office|headquarter/i
const streetOf = (tags: Record<string, string>) => (tags["addr:street"] || "").replace(/\s+/g, " ").trim()
const clean = (v: string | undefined) => (v || "").replace(/\s+/g, " ").trim()

function anyHours(tags: Record<string, string>): string | null {
  const raw = clean(tags.opening_hours)
  if (!raw) return null
  const week = parseOsmHours(raw)
  return week ? toNoctuaHours(week) : null
}

// Teléfono y web que OpenStreetMap trae (si los trae). Solo se guarda lo que tiene pinta de serlo.
export function essentialContact(tags: Record<string, string>): { phone: string | null; website: string | null } {
  const phoneRaw = clean((tags.phone || tags["contact:phone"] || "").split(";")[0])
  const digits = phoneRaw.replace(/\D/g, "")
  const phone = /^[+\d][\d\s().-]{6,}$/.test(phoneRaw) && digits.length >= 9 && digits.length <= 15 ? phoneRaw.slice(0, 40) : null
  let webRaw = clean((tags.website || tags["contact:website"] || "").split(";")[0])
  if (webRaw && !/^https?:\/\//i.test(webRaw)) webRaw = /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(webRaw) ? `https://${webRaw}` : ""
  const website = /^https?:\/\/[^\s]+$/i.test(webRaw) ? webRaw.slice(0, 300) : null
  return { phone, website }
}

export function osmSourceUrl(el: { type?: string; id?: number | string }): string | null {
  if (!el || !["node", "way", "relation"].includes(String(el.type)) || el.id == null) return null
  return `https://www.openstreetmap.org/${el.type}/${el.id}`
}

const VENDING_BUCKETS: Array<[string, string[]]> = [
  ["Bebidas", ["drinks", "cold_drinks", "soft_drinks", "water", "juice", "milk"]],
  ["Comida y snacks", ["food", "sweets", "snacks", "ice_cream", "sandwiches", "pizza", "bread", "eggs", "fruit"]],
  ["Café", ["coffee", "hot_drinks"]],
  ["Higiene", ["condoms", "feminine_hygiene", "hygiene", "diapers"]],
  ["Tecnología", ["electronics"]],
]
const VENDING_NAME: Record<string, string> = {
  "Bebidas": "Máquina de bebidas",
  "Comida y snacks": "Máquina de comida y snacks",
  "Café": "Máquina de café",
  "Higiene": "Máquina de higiene",
  "Tecnología": "Máquina de tecnología",
}

function judgeTaxi(tags: Record<string, string>): Verdict {
  if (RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }
  const named = clean(tags.name)
  if (named && NOT_A_RANK.test(named)) return { ok: false, reason: "no_es_una_parada" }
  const street = streetOf(tags)
  return { ok: true, name: (named || (street ? `Parada de taxi · ${street}` : "Parada de taxi")).slice(0, 120), openHours: null }
}

function judgeVeterinary(tags: Record<string, string>): Verdict {
  const name = essentialName(tags)
  if (!name) return { ok: false, reason: "sin_nombre" }
  const emergency = (tags.emergency || "").toLowerCase() === "yes"
  const raw = clean(tags.opening_hours)
  if (raw) {
    const week = parseOsmHours(raw)
    if (!week) return { ok: false, reason: "horario_no_entendido" }
    if (!isNightEssentialHours(week)) return { ok: false, reason: "no_es_de_noche" }
    return { ok: true, name, openHours: toNoctuaHours(week), attrs: emergency ? { emergency: true } : {} }
  }
  // Sin horario: solo si OpenStreetMap lo marca como urgencias.
  return emergency ? { ok: true, name, openHours: null, attrs: { emergency: true } } : { ok: false, reason: "sin_horario" }
}

function judgeToilets(tags: Record<string, string>): Verdict {
  if (RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }
  const hours = anyHours(tags)
  // Dentro de un edificio y sin horario: no se sabe cuándo se puede entrar.
  if (!hours && (tags.indoor || "").toLowerCase() === "yes") return { ok: false, reason: "sin_horario" }
  const street = streetOf(tags)
  const attrs: Record<string, unknown> = {}
  const fee = (tags.fee || "").toLowerCase()
  if (fee === "yes" || fee === "no") attrs.fee = fee === "yes"
  const wheelchair = (tags.wheelchair || "").toLowerCase()
  if (["yes", "no", "limited"].includes(wheelchair)) attrs.wheelchair = wheelchair
  const name = clean(tags.name) || (street ? `Aseos públicos · ${street}` : "Aseos públicos")
  return { ok: true, name: name.slice(0, 120), openHours: hours, attrs }
}

function judgeVending(tags: Record<string, string>): Verdict {
  const products = clean(tags.vending).toLowerCase().split(";").map((x) => x.trim()).filter(Boolean)
  const bucket = VENDING_BUCKETS.find(([, values]) => products.some((p) => values.includes(p)))
  if (!bucket) return { ok: false, reason: "producto_no_util" }
  if (RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }
  const hours = anyHours(tags)
  // Una máquina dentro de un local sin horario depende del local: no se sabe si se puede usar de noche.
  if (!hours && (tags.indoor || "").toLowerCase() === "yes") return { ok: false, reason: "sin_horario" }
  const sub = bucket[0]
  const street = streetOf(tags)
  const brand = clean(tags.brand || tags.operator)
  const name = clean(tags.name) || [VENDING_NAME[sub], brand || street].filter(Boolean).join(" · ")
  return { ok: true, name: name.slice(0, 120), openHours: hours, subcategory: sub, attrs: { products } }
}

function judgeLuggage(tags: Record<string, string>): Verdict {
  if (RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }
  const street = streetOf(tags)
  const attrs: Record<string, unknown> = { kind: tags.amenity === "luggage_locker" ? "locker" : "left_luggage" }
  const fee = (tags.fee || "").toLowerCase()
  if (fee === "yes" || fee === "no") attrs.fee = fee === "yes"
  const name = essentialName(tags) || (street ? `Consigna · ${street}` : "Consigna")
  return { ok: true, name, openHours: anyHours(tags), attrs }
}

const POLICE_NOT_A_STATION = new Set(["barracks", "training", "car_pound", "checkpoint", "academy", "detention", "surveillance", "customs"])
function policeForce(tags: Record<string, string>): string | null {
  const t = `${tags.name || ""} ${tags.operator || ""} ${tags.brand || ""}`.toLowerCase()
  if (/gu[aà]rdia urbana/.test(t)) return "Guardia Urbana"
  if (/mossos/.test(t)) return "Mossos d'Esquadra"
  if (/polic[ií]a nacional|cuerpo nacional/.test(t)) return "Policía Nacional"
  if (/guardia civil/.test(t)) return "Guardia Civil"
  return null
}
function judgePolice(tags: Record<string, string>): Verdict {
  if (POLICE_NOT_A_STATION.has((tags.police || "").toLowerCase())) return { ok: false, reason: "no_es_comisaria" }
  if (RESTRICTED_ACCESS.has((tags.access || "").toLowerCase())) return { ok: false, reason: "no_es_publico" }
  return { ok: true, name: essentialName(tags) || "Comisaría", openHours: anyHours(tags), subcategory: policeForce(tags) }
}

function judgeBicing(tags: Record<string, string>): Verdict {
  const street = streetOf(tags)
  const base = clean(tags.name)
  const name = base ? (/bicing/i.test(base) ? base : `Bicing · ${base}`) : street ? `Bicing · ${street}` : "Estación de Bicing"
  const attrs: Record<string, unknown> = {}
  const cap = parseInt(tags.capacity || "", 10)
  if (isFinite(cap) && cap > 0 && cap < 200) attrs.capacity = cap
  if (clean(tags.ref)) attrs.ref = clean(tags.ref).slice(0, 20)
  return { ok: true, name: name.slice(0, 120), openHours: null, subcategory: "Estación", attrs }
}

export function judgeEssential(type: EssentialType, tags: Record<string, string>): Verdict {
  if (type.key === "parking") return judgeParking(tags)
  switch (type.key) {
    case "taxi": return judgeTaxi(tags)
    case "veterinary": return judgeVeterinary(tags)
    case "toilets": return judgeToilets(tags)
    case "vending": return judgeVending(tags)
    case "luggage": return judgeLuggage(tags)
    case "police": return judgePolice(tags)
    case "bicing": return judgeBicing(tags)
  }
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
    case "taxi": return tags.amenity === "taxi"
    case "veterinary": return tags.amenity === "veterinary"
    case "toilets": return tags.amenity === "toilets"
    case "vending": return tags.amenity === "vending_machine"
    case "luggage": return tags.amenity === "luggage_locker" || tags.amenity === "left_luggage"
    case "police": return tags.amenity === "police"
    case "bicing": return tags.amenity === "bicycle_rental" && /bicing/i.test(`${tags.network || ""} ${tags.operator || ""}`)
  }
}
