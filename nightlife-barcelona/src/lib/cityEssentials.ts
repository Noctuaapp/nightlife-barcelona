import { CITIES, cityOfClub, type CityKey } from "./cities"

// Esenciales por ciudad (14/11/2026, Fase D de Madrid).
//
// La tabla `essentials` no tiene columna de ciudad y no hace falta: cada esencial lleva sus coordenadas y la ciudad sale de
// ellas (cityOfClub, que mira el rectángulo de cada ciudad en lib/cities.ts). Un esencial sin coordenadas es de Barcelona,
// como siempre. Así no hay SQL que ejecutar ni nada que rellenar a mano al importar.
//
// Mientras Madrid esté en «prelaunch» sus esenciales están ocultos (hidden = true) y solo el admin los ve, eligiendo Madrid en
// el selector de la cabecera (lib/previewCity.ts). Cuando se abra, el público ve los publicados.

type Place = {
  city?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

/** Los esenciales de una ciudad, por sus coordenadas. */
export function essentialsOfCity<T extends Place>(rows: T[], city: CityKey): T[] {
  return rows.filter((r) => cityOfClub(r) === city)
}

/**
 * Acota una consulta de `essentials` a una ciudad. Va ANTES de .order() y .range(): después, supabase-js ya no deja filtrar.
 *   · Barcelona: solo los publicados, como siempre (los de otra ciudad se quitan después con essentialsOfCity).
 *   · Otra ciudad: lo que cae dentro de su rectángulo (cities.ts); si aún está en prelaunch, también los ocultos.
 */
export function scopeToCity<Q>(query: Q, city: CityKey): Q {
  let q = query as any
  if (city === "barcelona") return q.eq("hidden", false)
  const b = CITIES[city].box
  q = q.gte("latitude", b.south).lte("latitude", b.north).gte("longitude", b.west).lte("longitude", b.east)
  return (CITIES[city].prelaunch ? q : q.eq("hidden", false)) as Q
}

/**
 * Deja fuera de una consulta lo que cae en el rectángulo de cualquier otra ciudad (para contar o listar solo lo de Barcelona
 * en el servidor, donde no se puede filtrar después). Lo que no tiene coordenadas se queda: es de Barcelona.
 */
export function outsideOtherCities<Q>(query: Q): Q {
  let q = query as any
  for (const c of Object.values(CITIES)) {
    if (c.key === "barcelona") continue
    const b = c.box
    q = q.or(`latitude.is.null,longitude.is.null,latitude.lt.${b.south},latitude.gt.${b.north},longitude.lt.${b.west},longitude.gt.${b.east}`)
  }
  return q as Q
}
