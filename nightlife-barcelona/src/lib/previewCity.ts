"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { CITIES, type CityKey } from "./cities"
import { supabase } from "./supabase"
import { useIsAdmin } from "./useIsAdmin"
import type { DbRow } from "./clubQueries"

// Vista previa de otra ciudad (14/11/2026). Mientras una ciudad esté en «prelaunch» (lib/cities.ts) el público no
// la ve: sus locales están ocultos (hidden = true) y no hay forma de elegirla. El admin sí puede elegirla en el
// selector de la cabecera y entonces la portada, el listado y el mapa enseñan los locales de esa ciudad (incluidos
// los ocultos) para ver cómo queda antes de abrirla.
//
// Se guarda en sessionStorage, como «Ver como usuario»: dura lo que dure la pestaña, así que no hay forma de
// quedarse en otra ciudad por olvido. Solo cambia lo que se ENSEÑA; nada se escribe en la base de datos. Con «Ver
// como usuario» puesto (useIsAdmin = false) todo vuelve a ser Barcelona, que es lo que ve un visitante.
//
// Los locales ocultos los lee el navegador con la misma clave pública de siempre (la lectura de `clubs` es pública
// en Supabase y lo oculto lo decide cada consulta con hidden = false), así que no hace falta ninguna ruta nueva.

export const PREVIEW_CITY_KEY = "noctua_preview_city"
const CHANGE_EVENT = "noctua:preview-city"

function isPreviewCity(v: unknown): v is CityKey {
  return typeof v === "string" && v in CITIES && CITIES[v as CityKey].prelaunch
}

function read(): CityKey | null {
  try {
    const v = window.sessionStorage.getItem(PREVIEW_CITY_KEY)
    return isPreviewCity(v) ? v : null
  } catch {
    return null
  }
}

/** Elige la ciudad en vista previa (null = volver a Barcelona). Solo vale para ciudades en prelaunch. */
export function setPreviewCity(key: CityKey | null): void {
  try {
    if (key && isPreviewCity(key)) window.sessionStorage.setItem(PREVIEW_CITY_KEY, key)
    else window.sessionStorage.removeItem(PREVIEW_CITY_KEY)
  } catch {
    /* sin almacenamiento: la elección no se puede recordar */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** Ciudad que se está viendo: Barcelona, salvo que el admin haya elegido una ciudad en vista previa. */
export function useSelectedCity(): CityKey {
  const isAdmin = useIsAdmin()
  const stored = useSyncExternalStore(subscribe, read, () => null)
  return isAdmin && stored ? stored : "barcelona"
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

const NONE: never[] = [] // siempre el mismo vacío: un [] nuevo en cada pintado volvería a lanzar los efectos que dependen de la lista

/**
 * Los locales que enseña una página. En Barcelona (lo normal) son los que ya trae el servidor. Con otra ciudad en
 * vista previa, los de esa ciudad, cargados desde el navegador; hasta que llegan, ninguno (no se enseñan los de
 * Barcelona bajo el nombre de otra ciudad).
 */
export function usePreviewClubs<T extends object>(serverClubs: T[], fields: string): T[] {
  const city = useSelectedCity()
  const [loaded, setLoaded] = useState<{ city: CityKey; rows: T[] } | null>(null)

  useEffect(() => {
    if (city === "barcelona") return
    let alive = true
    fetchCityClubs(CITIES[city].name, fields).then((rows) => {
      if (alive) setLoaded({ city, rows: rows as unknown as T[] })
    })
    return () => {
      alive = false
    }
  }, [city, fields])

  if (city === "barcelona") return serverClubs
  return loaded && loaded.city === city ? loaded.rows : (NONE as T[])
}
