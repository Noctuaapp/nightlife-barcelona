import { CITIES, cityFromPath, cityPath, isCityScoped, type CityKey } from "./cities"

// La ciudad que se recuerda mientras dura la pestaña (16/11/2026).
//
// La ciudad de una página la decide su dirección: Barcelona en la raíz y Madrid en /madrid (lib/cities.ts). Pero hay páginas que
// existen una sola vez para todas las ciudades y no llevan prefijo: el perfil, los favoritos, el acceso y el registro, el contacto,
// las preguntas frecuentes, los textos legales, la ficha de un evento… Sin más, quien venía de Madrid y abría una de ellas veía la
// cabecera en «Barcelona» y todos sus botones (el logo, las pestañas de abajo, el pie) le llevaban a Barcelona; lo mismo al
// iniciar sesión, que volvía a «/». Ahora la web se acuerda de la última ciudad que se vio, y esas páginas comunes la heredan.
//
// Reglas (ver cityForPath):
//   · Una página de una ciudad (/madrid/…, o «/», «/clubs», «/map»… que son de Barcelona) manda: es la ciudad en pantalla y
//     pasa a ser la recordada. La única forma de cambiar de ciudad es ir a una página de la otra, es decir, el selector de la cabecera.
//   · Una página común no decide nada: usa la ciudad recordada y no la cambia.
//   · La ficha de un local sí es común, pero sabe su ciudad (clubs/[slug]/page.tsx la envuelve en su CityScope), así que cuenta
//     como página de esa ciudad.
//   · Las páginas en otros idiomas (/en, /de, /fr, /it) y las que son solo de Barcelona (/zona, /nitbus…) son de Barcelona.
// Se guarda en dos sitios. En sessionStorage, que es de esa pestaña (dura también al ir a Google a iniciar sesión y volver) y
// manda sobre lo demás. Y en localStorage, con la hora y 7 días de vida, como respaldo para cuando se abre una página común en una
// PESTAÑA NUEVA (el enlace del correo de confirmación o de «he olvidado la contraseña», un marcador, «abrir en pestaña nueva»), donde
// sessionStorage está vacío: ahí sigue siendo la última ciudad que se vio en este navegador. Cualquier página de una ciudad pisa las dos,
// así que quien vuelve a Barcelona (o entra por Google en una página de Barcelona) no arrastra Madrid. Es una preferencia que elige la
// propia persona (como el idioma): no necesita el permiso del banner de cookies (lib/consent.ts). Si no hay nada guardado, Barcelona.

const KEY = "noctua_city"
export const CITY_MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000 // vida de la copia en localStorage (la de sessionStorage dura lo que la pestaña)

// Idiomas de fuera (contenido solo de Barcelona) y páginas que solo existen para Barcelona, aunque no lleven prefijo propio.
const BARCELONA_ONLY = /^\/(en|de|fr|it|zona|nitbus|nochevieja-barcelona)(\/|$)/

/** Texto guardado → ciudad conocida, o null si no es ninguna de las nuestras. */
export function parseCity(value: unknown): CityKey | null {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CITIES, value) ? (value as CityKey) : null
}

/**
 * La ciudad de una dirección y si «manda» (explicit): las páginas de una ciudad mandan y se recuerdan; las comunes usan la
 * recordada (o Barcelona si no hay) y no la cambian.
 */
export function cityForPath(pathname: string | null | undefined, remembered: CityKey | null): { city: CityKey; explicit: boolean } {
  const p = pathname || "/"
  if (cityFromPath(p) === "madrid") return { city: "madrid", explicit: true }
  if (BARCELONA_ONLY.test(p)) return { city: "barcelona", explicit: true }
  if (isCityScoped(p)) return { city: "barcelona", explicit: true }
  return { city: remembered ?? "barcelona", explicit: false }
}

/** Lo guardado en localStorage ({ city, at }) → la ciudad, si es de las nuestras y no ha caducado. */
export function parseStoredCity(raw: string | null | undefined, now: number = Date.now()): CityKey | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as { city?: unknown; at?: unknown } | null
    if (!o || typeof o !== "object" || typeof o.at !== "number") return null
    if (now - o.at > CITY_MEMORY_TTL_MS || now < o.at) return null
    return parseCity(o.city)
  } catch {
    return null
  }
}

/** La ciudad recordada: la de esta pestaña y, si no hay (pestaña nueva), la última de este navegador (null si ninguna o sin almacenamiento). */
export function readRememberedCity(): CityKey | null {
  try {
    const own = parseCity(window.sessionStorage.getItem(KEY))
    if (own) return own
  } catch {
    /* sin sessionStorage */
  }
  try {
    return parseStoredCity(window.localStorage.getItem(KEY))
  } catch {
    return null
  }
}

/** Recuerda la ciudad en pantalla. Sin almacenamiento (modo privado estricto…) no pasa nada: se queda en la de la dirección. */
export function rememberCity(city: CityKey): void {
  try {
    window.sessionStorage.setItem(KEY, city)
  } catch {
    /* sin sessionStorage */
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ city, at: Date.now() }))
  } catch {
    /* sin localStorage */
  }
}

/** La portada de la ciudad recordada: «/madrid» o «/». Para volver «a casa» desde una página común (tras iniciar sesión, etc.). */
export function rememberedHome(): string {
  if (typeof window === "undefined") return "/"
  return cityPath("/", readRememberedCity() ?? "barcelona")
}
