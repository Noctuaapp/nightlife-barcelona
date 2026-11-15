"use client"

import { useEffect, useState } from "react"
import { CITIES, type CityKey } from "./cities"
import { useCityScope } from "./cityScope"
import { supabase } from "./supabase"
import { clubsOfCity, type DbRow } from "./clubQueries"
import { selectAllPages } from "./fetchAll"

// Ciudad en pantalla y vista previa (14/11/2026).
//
// Desde la Fase E la ciudad la decide la dirección (lib/cityScope.tsx): Barcelona en la raíz y Madrid en /madrid. Antes el
// admin la elegía en un selector que se guardaba en sessionStorage; ya no hace falta, porque entrar en /madrid como admin
// ES la vista previa (mientras Madrid esté en «prelaunch», app/madrid/layout.tsx solo deja pasar al admin).
//
// En prelaunch los locales de Madrid están ocultos (hidden = true) y el servidor no los entrega; el navegador del admin los
// lee con la misma clave pública de siempre (la lectura de `clubs` es pública en Supabase y lo oculto lo decide cada consulta
// con hidden = false), así que no hace falta ninguna ruta nueva. Con la ciudad abierta, los locales llegan del servidor.

/** Ciudad que se está viendo: la de la dirección (CityScope). Sin CityScope, Barcelona. */
export function useSelectedCity(): CityKey {
  return useCityScope() ?? "barcelona"
}

const PAGE = 1000

/**
 * Todos los locales de una ciudad (por el texto de su ciudad), ocultos incluidos. Pide de 1000 en 1000 (el tope de
 * Supabase por consulta). Si alguna columna de la lista no existe todavía en la base de datos, repite con todas.
 */
export async function fetchCityClubs(cityName: string, fields: string): Promise<DbRow[]> {
  const out: DbRow[] = []
  for (let page = 0; page < 8; page++) {
    const from = page * PAGE
    const ask = (cols: string) => supabase.from("clubs").select(cols).ilike("city", cityName).order("id").range(from, from + PAGE - 1)
    let res: { data: unknown; error: unknown } = await ask(fields)
    if (res.error) res = await ask("*")
    if (res.error) break
    const rows = (res.data || []) as DbRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

/**
 * Los locales de una ciudad para las páginas que los piden desde el navegador (mapa, plan). Con la ciudad abierta, solo los
 * publicados; con la ciudad en prelaunch (el admin en /madrid), también los ocultos. Siempre solo los de esa ciudad.
 * `fields` debe incluir city, latitude y longitude (la ciudad de cada local sale de ahí).
 */
export async function fetchCityClubsFor(city: CityKey, fields: string): Promise<DbRow[]> {
  if (CITIES[city].prelaunch) return clubsOfCity(await fetchCityClubs(CITIES[city].name, fields), city)
  const ask = (cols: string) => selectAllPages((from, to) => supabase.from("clubs").select(cols).eq("hidden", false).order("id").range(from, to))
  let res = await ask(fields)
  if (res.error) res = await ask("*")
  return clubsOfCity(((res.data || []) as unknown as DbRow[]), city)
}

const NONE: never[] = [] // siempre el mismo vacío: un [] nuevo en cada pintado volvería a lanzar los efectos que dependen de la lista

/**
 * Los locales que enseña una página. En una ciudad abierta (Barcelona, o Madrid cuando se abra) son los que ya trae el
 * servidor. Con una ciudad en prelaunch (solo el admin llega a verla), los de esa ciudad, cargados desde el navegador y
 * con los ocultos incluidos; hasta que llegan, ninguno (no se enseñan los de otra ciudad bajo su nombre).
 */
export function usePreviewClubs<T extends object>(serverClubs: T[], fields: string): T[] {
  const city = useSelectedCity()
  const preview = CITIES[city].prelaunch
  const [loaded, setLoaded] = useState<{ city: CityKey; rows: T[] } | null>(null)

  useEffect(() => {
    if (!preview) return
    let alive = true
    fetchCityClubs(CITIES[city].name, fields).then((rows) => {
      if (alive) setLoaded({ city, rows: rows as unknown as T[] })
    })
    return () => {
      alive = false
    }
  }, [city, fields, preview])

  if (!preview) return serverClubs
  return loaded && loaded.city === city ? loaded.rows : (NONE as T[])
}
