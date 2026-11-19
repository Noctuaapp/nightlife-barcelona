import { CITIES, cityOfClub, type CityKey } from "./cities"

// Admin por ciudad (15/11/2026).
//
// El admin tiene un selector Barcelona | Madrid. Lo que es de una ciudad (clubs, eventos, esenciales, visitas, datos...) se
// ve y se gestiona solo de la ciudad elegida; lo común (usuarios, mensajes, opiniones...) no cambia. Aquí está la parte pura:
// la clave con la que se recuerda la elección y los filtros por ciudad, para poder probarlos sin pantalla.

/** Clave de localStorage con la ciudad elegida en el admin. */
export const ADMIN_CITY_STORAGE_KEY = "noctua_admin_city"

/** Ciudad por defecto del admin: Barcelona, como siempre. */
export const ADMIN_DEFAULT_CITY: CityKey = "barcelona"

/** Lo que haya guardado (o nada) → una ciudad válida. Cualquier valor raro es Barcelona. */
export function parseAdminCity(value: unknown): CityKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CITIES, value) ? (value as CityKey) : ADMIN_DEFAULT_CITY
}

type Place = {
  city?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

/**
 * Las filas de una ciudad, por el texto de su ciudad y, si no basta, por sus coordenadas (cityOfClub): sirve igual para clubs,
 * eventos y esenciales. Lo que no tiene ciudad ni coordenadas es de Barcelona, como en toda la web.
 */
export function rowsOfCity<T extends Place>(rows: T[], city: CityKey): T[] {
  return rows.filter((r) => cityOfClub(r) === city)
}

/**
 * Cuántos clubs hay en cada ciudad, publicados y ocultos (Ajustes y herramientas › Estado, 20/11/2026). Usa el mismo reparto que
 * la pantalla Clubs (rowsOfCity), así que las cifras coinciden con las de allí.
 */
export function clubCountsByCity<T extends Place & { hidden?: boolean | null }>(rows: T[]): Record<CityKey, { visible: number; hidden: number }> & { total: { visible: number; hidden: number } } {
  const out = { total: { visible: 0, hidden: 0 } } as Record<CityKey, { visible: number; hidden: number }> & { total: { visible: number; hidden: number } }
  for (const key of Object.keys(CITIES) as CityKey[]) out[key] = { visible: 0, hidden: 0 }
  for (const r of rows) {
    const k = r.hidden ? "hidden" : "visible"
    out[cityOfClub(r)][k]++
    out.total[k]++
  }
  return out
}

/** Los ids de los locales de una ciudad (para filtrar tablas que solo guardan club_id: noches de club, sesiones semanales...). */
export function clubIdsOfCity<T extends Place & { id: number }>(clubs: T[], city: CityKey): Set<number> {
  return new Set(rowsOfCity(clubs, city).map((c) => c.id))
}

/**
 * Las filas que cuelgan de un local (por club_id) y son de la ciudad. Una fila sin club (club_id nulo) o de un local que ya
 * no existe se queda en Barcelona, que es donde estaba todo antes de abrir Madrid.
 */
export function rowsOfCityByClub<T extends { club_id?: number | null }>(rows: T[], ids: Set<number>, clubsKnown: Set<number>, city: CityKey): T[] {
  return rows.filter((r) => {
    const id = r.club_id
    if (id == null || !clubsKnown.has(id)) return city === "barcelona"
    return ids.has(id)
  })
}

/** Nombre con el que se guarda la ciudad de un local nuevo. Barcelona no escribe nada (lo que ponga la base por defecto, como siempre). */
export function cityNameForNewRow(city: CityKey): { city?: string } {
  return city === "barcelona" ? {} : { city: CITIES[city].name }
}

/** ¿Está la ciudad aún cerrada al público? (para avisarlo en el admin: lo que se ve aquí no es público todavía). */
export function isCityPrelaunch(city: CityKey): boolean {
  return CITIES[city].prelaunch
}

// ───────────────────────── Eventos ─────────────────────────
// La tabla `events` no tiene ciudad. La ciudad de un evento sale de sus coordenadas y, si no las tiene, del local donde es
// (por el nombre): si ese nombre es de un local de Madrid, el evento es de Madrid. Lo que no encaja en nada es de Barcelona.

/** Nombre sin tildes, mayúsculas ni espacios de más, para comparar el nombre de un local con el de un evento. */
export function foldName(value: string | null | undefined): string {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * Índice nombre de local → ciudad. Un nombre que está en las dos ciudades (una cadena) no entra: ahí no se puede saber de cuál es
 * el evento por el nombre y mandan las coordenadas.
 */
export function clubCityIndex<T extends Place & { name?: string | null }>(clubs: T[]): Map<string, CityKey> {
  const index = new Map<string, CityKey>()
  const ambiguous = new Set<string>()
  for (const c of clubs) {
    const key = foldName(c.name)
    if (!key || ambiguous.has(key)) continue
    const city = cityOfClub(c)
    const known = index.get(key)
    if (known && known !== city) {
      index.delete(key)
      ambiguous.add(key)
    } else {
      index.set(key, city)
    }
  }
  return index
}

type EventPlace = Place & { club_name?: string | null }

function hasCoords(e: Place): boolean {
  return e.latitude != null && e.latitude !== "" && e.longitude != null && e.longitude !== ""
}

/** Ciudad de un evento: sus coordenadas, y si no las tiene, la ciudad del local por su nombre. */
export function cityOfEvent(e: EventPlace, index: Map<string, CityKey>): CityKey {
  if (hasCoords(e)) return cityOfClub(e)
  return index.get(foldName(e.club_name)) ?? cityOfClub(e)
}

/** Los eventos de una ciudad. */
export function eventsOfCity<T extends EventPlace>(events: T[], city: CityKey, index: Map<string, CityKey>): T[] {
  return events.filter((e) => cityOfEvent(e, index) === city)
}
