import type { CityKey } from "./cities"

// Herramientas del admin por ciudad (15/11/2026). Lo que cambia según la ciudad que se elige en el menú del admin: qué
// importadores salen, qué zonas se pueden elegir y qué categorías tienen sentido. Aquí está la parte pura, para probarla sin pantalla.

type AreaList = [value: string, label: string][]

/** Zonas del importador de locales y de esenciales de OpenStreetMap, por ciudad. */
export const OSM_AREAS_BY_CITY: Record<CityKey, AreaList> = {
  barcelona: [
    ["barcelona", "Barcelona"],
    ["hospitalet", "L'Hospitalet"],
    ["badalona", "Badalona"],
    ["elprat", "El Prat"],
    ["santacoloma", "Santa Coloma de Gramenet"],
    ["cornella", "Cornellà de Llobregat"],
    ["santadria", "Sant Adrià de Besòs"],
    ["esplugues", "Esplugues de Llobregat"],
    ["santfeliu", "Sant Feliu de Llobregat"],
    ["santboi", "Sant Boi de Llobregat"],
  ],
  madrid: [
    ["madrid1", "Madrid · parte 1 (sur: Sol, Atocha, Usera)"],
    ["madrid2", "Madrid · parte 2 (norte: Chueca, Malasaña, Chamartín)"],
  ],
}

/** Zonas por las que recorre «Importar lo que falta» (las mismas de arriba, con el nombre corto). */
export const ESSENTIAL_AREAS_BY_CITY: Record<CityKey, AreaList> = {
  barcelona: [
    ["barcelona", "Barcelona"],
    ["hospitalet", "L'Hospitalet"],
    ["badalona", "Badalona"],
    ["elprat", "El Prat"],
    ["santacoloma", "Santa Coloma"],
    ["cornella", "Cornellà"],
    ["santadria", "Sant Adrià"],
    ["esplugues", "Esplugues"],
    ["santfeliu", "Sant Feliu"],
    ["santboi", "Sant Boi"],
  ],
  madrid: [
    ["madrid1", "Madrid · parte 1"],
    ["madrid2", "Madrid · parte 2"],
  ],
}

/** Categorías nuevas de esenciales (de una en una) que importa «Importar lo que falta». Bicing es de Barcelona; BiciMAD y los estancos, de Madrid. */
export const NEW_ESSENTIAL_CATS_BY_CITY: Record<CityKey, [value: string, label: string][]> = {
  barcelona: [
    ["taxi", "Paradas de taxi"],
    ["veterinary", "Veterinarios de urgencias"],
    ["toilets", "Aseos públicos"],
    ["vending", "Máquinas expendedoras"],
    ["luggage", "Consignas"],
    ["police", "Comisarías y policía"],
    ["bicing", "Estaciones de Bicing"],
  ],
  madrid: [
    ["taxi", "Paradas de taxi"],
    ["veterinary", "Veterinarios de urgencias"],
    ["toilets", "Aseos públicos"],
    ["vending", "Máquinas expendedoras"],
    ["luggage", "Consignas"],
    ["police", "Comisarías y policía"],
    ["bicimad", "Estaciones de BiciMAD"],
    ["tobacco", "Estancos"],
  ],
}

// Categorías que solo existen en una ciudad (las mismas que la web pública: components/city/EssentialsCategoryServer.tsx).
const ONLY_BARCELONA = new Set(["bicing", "parking"])
const ONLY_MADRID = new Set(["bicimad", "tobacco"])

/** ¿Tiene sentido esta categoría de esenciales en la ciudad? («all» y las comunes, sí.) */
export function isCategoryOfCity(category: string, city: CityKey): boolean {
  if (city === "barcelona") return !ONLY_MADRID.has(category)
  return !ONLY_BARCELONA.has(category)
}

/** La primera zona de la ciudad (la que se preselecciona al cambiar de ciudad). */
export function firstAreaOf(city: CityKey): string {
  return OSM_AREAS_BY_CITY[city][0][0]
}

/** ¿Es esta zona de esta ciudad? */
export function isAreaOfCity(area: string, city: CityKey): boolean {
  return OSM_AREAS_BY_CITY[city].some(([value]) => value === area)
}

/** Las herramientas que salen para una ciudad: las que no son de ninguna en concreto y las suyas. */
export function toolsOfCity<T extends { city?: CityKey }>(tools: T[], city: CityKey): T[] {
  return tools.filter((t) => !t.city || t.city === city)
}
