import { Pill, Banknote, UtensilsCrossed, TrainFront, Bus, ShoppingCart, Dices, Fuel, Hospital, MapPin, CircleParking, CarTaxiFront, PawPrint, Toilet, CupSoda, Bike, Luggage, Siren, PackageSearch, type LucideIcon } from "lucide-react"

// Catálogo ÚNICO de categorías de esenciales (05/11/2026). Antes la lista vivía en seis sitios
// (esta, los importadores, el cron de Google, la restricción SQL de sugerencias, el admin y los
// textos); ahora esta es la fuente y el resto la lee de aquí.
//
// Cada categoría dice:
//   key        valor de la columna `category` en la base
//   slug       URL (/essentials/<slug>)
//   group      grupo de la portada
//   availability  cómo se sabe si está disponible:
//                 schedule → por su horario (open_hours)
//                 always   → siempre accesible, sin horario (fuentes, paradas de taxi)
//                 on_call  → solo por llamada
//   trust      qué hacer con un horario que nadie de Noctua ha verificado:
//                 directory → se da por bueno el del directorio (OpenStreetMap, Google), como hasta ahora
//                 strict    → NO se enseña como abierto hasta que se verifica («sin confirmar»). Para
//                             categorías donde ir a una puerta cerrada de madrugada sale caro
//   expiryDays días que vale una verificación antes de volver a «sin verificar»
//   minPlaces  sitios mínimos para enseñar la categoría en la portada (no se añaden categorías «de relleno»)
//
// Hotel se quitó el 05/11/2026 (sus filas están ocultas en la base). Taxi vuelve, pero con paradas
// reales y teléfonos, no con las oficinas de Uber/Cabify que había antes.
export type EssentialGroup = "health" | "move" | "food" | "personal" | "other"
export type Availability = "schedule" | "always" | "on_call"
export type EssentialCategory = {
  key: string
  slug: string
  icon: LucideIcon
  group: EssentialGroup
  availability: Availability
  trust: "directory" | "strict"
  expiryDays: number
  minPlaces: number
}

export const ESSENTIAL_GROUPS: EssentialGroup[] = ["health", "move", "food", "personal", "other"]

export const ESSENTIAL_CATEGORIES: EssentialCategory[] = [
  // Urgencias y salud
  { key: "Pharmacy", slug: "pharmacy", icon: Pill, group: "health", availability: "schedule", trust: "directory", expiryDays: 180, minPlaces: 1 },
  { key: "Hospital", slug: "hospital", icon: Hospital, group: "health", availability: "schedule", trust: "strict", expiryDays: 90, minPlaces: 1 },
  { key: "Veterinary", slug: "veterinary", icon: PawPrint, group: "health", availability: "schedule", trust: "strict", expiryDays: 90, minPlaces: 1 },
  { key: "Police", slug: "police", icon: Siren, group: "health", availability: "schedule", trust: "strict", expiryDays: 180, minPlaces: 1 },
  // Moverse
  { key: "Taxi", slug: "taxi", icon: CarTaxiFront, group: "move", availability: "always", trust: "directory", expiryDays: 180, minPlaces: 3 },
  { key: "Metro", slug: "metro", icon: TrainFront, group: "move", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
  { key: "Nitbus", slug: "nitbus", icon: Bus, group: "move", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
  { key: "Parking", slug: "parking", icon: CircleParking, group: "move", availability: "always", trust: "directory", expiryDays: 365, minPlaces: 1 },
  // Bicing: solo la ubicación de las estaciones; las bicis libres en directo no se enseñan (ver la propuesta).
  { key: "Bicing", slug: "bicing", icon: Bike, group: "move", availability: "always", trust: "directory", expiryDays: 365, minPlaces: 5 },
  // Comer y comprar
  { key: "Food", slug: "food", icon: UtensilsCrossed, group: "food", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
  { key: "Supermarket", slug: "supermarket", icon: ShoppingCart, group: "food", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
  { key: "Vending", slug: "vending", icon: CupSoda, group: "food", availability: "schedule", trust: "strict", expiryDays: 180, minPlaces: 3 },
  { key: "ATM", slug: "atm", icon: Banknote, group: "food", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
  { key: "Gas Station", slug: "gas-station", icon: Fuel, group: "food", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
  // Necesidades personales
  { key: "Toilets", slug: "toilets", icon: Toilet, group: "personal", availability: "schedule", trust: "strict", expiryDays: 180, minPlaces: 5 },
  { key: "Luggage", slug: "luggage", icon: Luggage, group: "personal", availability: "schedule", trust: "strict", expiryDays: 180, minPlaces: 3 },
  { key: "LostFound", slug: "lost-found", icon: PackageSearch, group: "personal", availability: "schedule", trust: "strict", expiryDays: 180, minPlaces: 1 },
  // Otros
  { key: "Casino", slug: "casino", icon: Dices, group: "other", availability: "schedule", trust: "directory", expiryDays: 365, minPlaces: 1 },
]

const FALLBACK: Omit<EssentialCategory, "key" | "slug"> = {
  icon: MapPin,
  group: "other",
  availability: "schedule",
  trust: "directory",
  expiryDays: 365,
  minPlaces: 1,
}

export function categoryInfo(key: string): EssentialCategory {
  return ESSENTIAL_CATEGORIES.find((c) => c.key === key) || { key, slug: key.toLowerCase().replace(/\s+/g, "-"), ...FALLBACK }
}

export function categoryRank(key: string): number {
  const i = ESSENTIAL_CATEGORIES.findIndex((c) => c.key === key)
  return i === -1 ? 99 : i
}

// Las categorías que se enseñan en cualquier lista: las del catálogo. Una fila vieja con una
// categoría que ya no existe (Hotel, Taxi de las oficinas de Uber, Transport) no sale.
export function isKnownCategory(key: string | null | undefined): boolean {
  return !!key && ESSENTIAL_CATEGORIES.some((c) => c.key === key)
}

// Nombre en español de cada categoría por su slug de la URL, para el admin (Datos, Visitas, Actividad),
// que siempre está en español y recibe el slug tal cual lo guardó la analítica.
const SLUG_LABEL_ES: Record<string, string> = {
  pharmacy: "Farmacias",
  atm: "Cajeros",
  food: "Comida",
  supermarket: "Supermercados",
  metro: "Metro",
  nitbus: "Nitbus",
  hospital: "Urgencias y hospitales",
  "gas-station": "Gasolineras",
  parking: "Parkings gratis",
  casino: "Casinos",
  taxi: "Taxi y VTC",
  veterinary: "Veterinarios",
  toilets: "Aseos públicos",
  vending: "Máquinas expendedoras",
  bicing: "Estaciones de Bicing",
  luggage: "Consignas",
  police: "Comisarías y policía",
  "lost-found": "Objetos perdidos",
  hotel: "Hoteles (retirado)",
}
export function essentialSlugLabelEs(slug: string | null | undefined): string {
  if (!slug) return "—"
  return SLUG_LABEL_ES[slug] || slug
}

// Clave de traducción del nombre: essentials.category_names.<Key sin espacios>
export const categoryNameKey = (key: string) => `essentials.category_names.${key.replace(/\s+/g, "")}`
export const categoryDescKey = (key: string) => `essentials.categories.${key.replace(/\s+/g, "")}`
export const groupNameKey = (group: EssentialGroup) => `essentialsPage.groups.${group}`
