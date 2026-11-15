import { CITIES, cityPath, type CityKey } from "./cities"

// Sugerencias de esenciales por ciudad (15/11/2026, supabase/106).
//
// El formulario «¿Nos faltan esenciales?» (/essentials/sugerir) es una página común a las ciudades, así que la ciudad no sale de la
// dirección: la pone el enlace con el que se llega («?ciudad=madrid»). Sin nada, o con cualquier otra cosa, es Barcelona.

/** Ciudad de una sugerencia o de un valor suelto. Todo lo que no sea «madrid» es Barcelona (como las sugerencias de antes). */
export function suggestionCity(value: unknown): CityKey {
  return typeof value === "string" && value.trim().toLowerCase() === "madrid" ? "madrid" : "barcelona"
}

/** Ciudad que lleva la dirección del formulario (`?ciudad=madrid`). Acepta la cadena con o sin «?». */
export function cityFromSuggestSearch(search: string | null | undefined): CityKey {
  const value = new URLSearchParams((search || "").replace(/^\?/, "")).get("ciudad")
  return suggestionCity(value)
}

/** Dirección del formulario para una ciudad. En Barcelona es la de siempre. */
export function suggestHref(city: CityKey): string {
  return city === "barcelona" ? "/essentials/sugerir" : `/essentials/sugerir?ciudad=${city}`
}

/** A dónde vuelve «Volver» del formulario: los esenciales de esa ciudad. */
export function suggestBackHref(city: CityKey): string {
  return cityPath("/essentials", city)
}

/** Lo que se guarda en la columna city al enviar. En Barcelona no se manda nada (la base pone «barcelona»), igual que antes del 106. */
export function suggestionCityField(city: CityKey): { city?: CityKey } {
  return city === "barcelona" ? {} : { city }
}

/** Las sugerencias de una ciudad. Una fila sin ciudad (antes del SQL 106) es de Barcelona. */
export function suggestionsOfCity<T extends { city?: string | null }>(rows: T[], city: CityKey): T[] {
  return rows.filter((r) => suggestionCity(r.city) === city)
}

type Addressable = { name: string; street: string; street_number: string | null; city?: string | null }

/** Dirección corta: calle y número. */
export function suggestionAddress(r: Pick<Addressable, "street" | "street_number">): string {
  return `${r.street}${r.street_number ? ` ${r.street_number}` : ""}`
}

/** Búsqueda en Google Maps con la ciudad de la sugerencia (antes siempre ponía Barcelona). */
export function suggestionMapsUrl(r: Addressable): string {
  const cityName = CITIES[suggestionCity(r.city)].name
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${suggestionAddress(r)} ${cityName}`)}`
}

/** Texto de «Copiar datos»: nombre, tipo y dirección con la ciudad de la sugerencia. */
export function suggestionCopyText(r: Addressable, categoryLabel: string): string {
  return `${r.name}\n${categoryLabel}\n${suggestionAddress(r)}, ${CITIES[suggestionCity(r.city)].name}`
}
