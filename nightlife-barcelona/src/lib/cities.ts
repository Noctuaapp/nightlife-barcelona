// Ciudades que Noctua conoce (14/11/2026). Hasta hoy todo era Barcelona (y su área metropolitana); aquí se prepara Madrid
// SIN que se vea todavía en la web: sus locales entran ocultos (hidden = true) y, mientras la ciudad esté en
// «prelaunch», la tarea nocturna de Google no los toca (no gasta el tope diario ni les busca ficha «en Barcelona»).
//
// Para abrir Madrid al público el día que toque:
//   1. aquí: prelaunch: false en Madrid;
//   2. en Supabase: update public.cities set enabled = true where slug = 'madrid';
//   3. publicar los locales (Admin › Clubs › filtro «Ocultos») y los esenciales (Admin › Esenciales).
//
// Barcelona es la ciudad por defecto: cualquier local sin ciudad o con una ciudad que no sea Madrid se trata como hasta ahora.
//
// URLs (Fase E): Barcelona vive en la raíz de siempre (/, /clubs, /essentials…) y Madrid en /madrid (/madrid, /madrid/clubs,
// /madrid/essentials, /madrid/barrio/malasana…). La ficha de cada local es la misma para todas las ciudades (/clubs/[slug]: el
// slug es único) y la ciudad se toma del propio local. Mientras Madrid esté en prelaunch, /madrid solo se abre al admin.

export type CityKey = "barcelona" | "madrid"

export type CityBox = { south: number; north: number; west: number; east: number }

export type City = {
  key: CityKey
  name: string
  /** Centro y radio (m) para sesgar las búsquedas de Google hacia esta ciudad. */
  center: { lat: number; lng: number }
  radiusM: number
  /** Rectángulo que contiene la ciudad y su entorno: un resultado fuera de aquí casi seguro es de otro sitio. */
  box: CityBox
  /** true = todavía no está abierta al público: se prepara, pero las tareas automáticas de Google la dejan en paz. */
  prelaunch: boolean
  /** Foto de fondo de la portada (public/hero). Cada ciudad lleva la suya: mismo estilo, sus monumentos. */
  heroImage: string
}

export const CITIES: Record<CityKey, City> = {
  barcelona: {
    key: "barcelona",
    name: "Barcelona",
    center: { lat: 41.3874, lng: 2.1686 },
    radiusM: 20000,
    box: { south: 41.28, north: 41.55, west: 1.95, east: 2.35 },
    prelaunch: false,
    heroImage: "/hero/skyline_barcelona.jpeg",
  },
  madrid: {
    key: "madrid",
    name: "Madrid",
    center: { lat: 40.4168, lng: -3.7038 },
    radiusM: 25000,
    box: { south: 40.2, north: 40.7, west: -4.0, east: -3.4 },
    prelaunch: true,
    heroImage: "/hero/skyline_madrid.jpeg",
  },
}

export function inBox(box: CityBox, lat: number, lng: number): boolean {
  return lat > box.south && lat < box.north && lng > box.west && lng < box.east
}

/**
 * Ciudades que salen en el selector de la cabecera: las abiertas, para todo el mundo; las que están en prelaunch,
 * solo para el admin (vista previa). Con una sola opción el selector no se pinta: queda la etiqueta de siempre.
 */
export function selectableCities(isAdmin: boolean): City[] {
  return Object.values(CITIES).filter((c) => isAdmin || !c.prelaunch)
}

/** ¿Cae el punto dentro de alguna de las ciudades conocidas? */
export function inAnyCityBox(lat: number, lng: number): boolean {
  return Object.values(CITIES).some((c) => inBox(c.box, lat, lng))
}

type ClubPlace = {
  city?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

function numberOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Ciudad de un local: por el texto de su ciudad y, si no basta, por sus coordenadas. Por defecto, Barcelona. */
export function cityOfClub(club: ClubPlace): CityKey {
  if (/^\s*madrid\b/i.test(club.city || "")) return "madrid"
  const lat = numberOrNull(club.latitude)
  const lng = numberOrNull(club.longitude)
  if (lat !== null && lng !== null && inBox(CITIES.madrid.box, lat, lng)) return "madrid"
  return "barcelona"
}

/**
 * Nombre de la ciudad de un local cuando NO es Barcelona (null si es de Barcelona o su área). Sirve para las tarjetas:
 * un local sin barrio pone «Barcelona» como siempre y uno de Madrid pone «Madrid».
 */
export function otherCityName(club: ClubPlace): string | null {
  const key = cityOfClub(club)
  return key === "barcelona" ? null : CITIES[key].name
}

type ClubForSearch = ClubPlace & { name: string; address?: string | null; neighborhood?: string | null }

/**
 * Texto con el que se busca el local en Google Places. Para Barcelona sale exactamente el mismo de siempre
 * («nombre dirección Barcelona»); para otras ciudades acaba en su nombre y lleva sesgo hacia ella
 * (Barcelona no lleva sesgo en esta búsqueda manual, como hasta ahora).
 */
export function googleSearchFor(club: ClubForSearch): {
  city: CityKey
  query: string
  locationBias?: { circle: { center: { latitude: number; longitude: number }; radius: number } }
} {
  const key = cityOfClub(club)
  const city = CITIES[key]
  const query = `${club.name} ${club.address || club.neighborhood || ""} ${city.name}`.trim()
  if (key === "barcelona") return { city: key, query }
  return {
    city: key,
    query,
    locationBias: { circle: { center: { latitude: city.center.lat, longitude: city.center.lng }, radius: city.radiusM } },
  }
}

/** Nombres de ciudad (como se guardan en clubs.city) cuyos locales las tareas automáticas de Google deben saltarse. */
export const PRELAUNCH_CITY_NAMES: string[] = Object.values(CITIES)
  .filter((c) => c.prelaunch)
  .map((c) => c.name)

/**
 * Filtro de PostgREST (para .or()) que deja fuera los locales de ciudades en prelaunch. Lleva «city is null» aparte porque
 * un NOT ILIKE sobre NULL no devuelve la fila y se perderían los locales sin ciudad.
 */
export const EXCLUDE_PRELAUNCH_OR = ["city.is.null", ...PRELAUNCH_CITY_NAMES.map((n) => `city.not.ilike.${n}`)].join(",")

// ───────────────────────── URLs por ciudad (Fase E) ─────────────────────────

/** Prefijo de URL de cada ciudad: Barcelona, en la raíz de siempre; Madrid, en /madrid. */
export const CITY_PREFIX: Record<CityKey, string> = { barcelona: "", madrid: "/madrid" }

/** ¿Es esta una ciudad abierta al público (no está en prelaunch)? */
export function isCityOpen(key: CityKey): boolean {
  return !CITIES[key].prelaunch
}

/** Ciudad de una ruta: /madrid y todo lo que cuelga de ella es Madrid; el resto, Barcelona. */
export function cityFromPath(pathname: string | null | undefined): CityKey {
  const p = pathname || ""
  return p === "/madrid" || p.startsWith("/madrid/") ? "madrid" : "barcelona"
}

// Separa la ruta de lo que va detrás (?consulta o #ancla), que se conserva tal cual.
function splitPath(path: string): { pathname: string; rest: string } {
  const i = path.search(/[?#]/)
  return i === -1 ? { pathname: path, rest: "" } : { pathname: path.slice(0, i), rest: path.slice(i) }
}

// Páginas que tienen versión propia en Madrid (con la ruta de Barcelona como referencia). Todo lo demás (la ficha de un
// local, favoritos, el perfil, los textos legales…) es común a las ciudades y no cambia de dirección.
const SCOPED_EXACT = new Set(["/", "/clubs", "/essentials", "/map", "/plan"])
const SCOPED_PREFIX = ["/essentials/", "/barrio/", "/musica/"]

/** ¿Esta ruta (sin prefijo de ciudad) tiene versión propia por ciudad? */
export function isCityScoped(pathname: string): boolean {
  // «Sugerir un esencial» es una página común (un formulario): no tiene versión por ciudad.
  if (pathname === "/essentials/sugerir") return false
  return SCOPED_EXACT.has(pathname) || SCOPED_PREFIX.some((p) => pathname.startsWith(p))
}

/**
 * La dirección de una página dentro de una ciudad: «/clubs» en Madrid es «/madrid/clubs». En Barcelona se devuelve igual.
 * Solo se prefijan las páginas que tienen versión por ciudad; enlaces externos, anclas y rutas comunes no se tocan.
 */
export function cityPath(path: string, city: CityKey): string {
  if (city === "barcelona") return path
  if (!path.startsWith("/") || path.startsWith("//")) return path
  const { pathname, rest } = splitPath(path)
  if (pathname === "/madrid" || pathname.startsWith("/madrid/")) return path
  if (!isCityScoped(pathname)) return path
  return (pathname === "/" ? CITY_PREFIX[city] : CITY_PREFIX[city] + pathname) + rest
}

/** Quita el prefijo de ciudad: «/madrid/clubs» → «/clubs», «/madrid» → «/». */
export function stripCityPath(path: string): string {
  const { pathname, rest } = splitPath(path)
  if (pathname === "/madrid") return "/" + rest
  if (pathname.startsWith("/madrid/")) return pathname.slice("/madrid".length) + rest
  return path
}

/** Dirección completa (con dominio) de una página dentro de una ciudad, para metadatos y datos estructurados. */
export function cityUrl(path: string, city: CityKey): string {
  const full = cityPath(path, city)
  return full === "/" ? "https://www.noctuaapp.com" : `https://www.noctuaapp.com${full}`
}

// Páginas que existen igual en todas las ciudades y a las que tiene sentido ir al cambiar de ciudad.
const PORTABLE = new Set(["/", "/clubs", "/essentials", "/map", "/plan"])

/**
 * Adónde lleva el selector de ciudad: a la misma página en la otra ciudad si existe allí (Clubs, Esenciales, Mapa, Plan) y,
 * si no (un barrio, una categoría, una ficha), a la portada de esa ciudad. La consulta (?id=…) se descarta: lo marcado en
 * una ciudad (un club, un esencial) no existe en la otra.
 */
export function switchCityPath(current: string, to: CityKey): string {
  const { pathname } = splitPath(stripCityPath(current))
  const target = PORTABLE.has(pathname) ? pathname : "/"
  return cityPath(target, to)
}
