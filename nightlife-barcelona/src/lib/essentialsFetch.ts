import { fetchAllPages } from "./fetchAll"
import { scopeToCity } from "./cityEssentials"
import type { CityKey } from "./cities"

// Las columnas que de verdad usa la portada de Esenciales (20/11/2026).
//
// La portada pedía `select=*` de más de 3.000 filas (paradas de Metro, Nitbus, Bicing…) y con ello cada fila arrastraba la
// descripción, el enlace de Maps, la web, las notas de horario, el origen del dato, etc., que aquí no se enseñan nunca. Eso son
// varios MB de JSON por visita, y en el móvil se nota. Solo se piden las que se usan:
//   · lista y buscador: id, name, category, neighborhood, address, image
//   · «cerca de ti» y la tarjeta de cada categoría: latitude, longitude
//   · «abierto ahora» (lib/availability.ts): open_hours, is_24h, phone, verification_status, last_verified_at, attrs
// Si una columna nueva hace falta en la portada, se añade AQUÍ (y en lib/availability.ts si es de horario).
export const ESSENTIAL_LIST_COLUMNS =
  "id, name, category, neighborhood, address, image, latitude, longitude, open_hours, is_24h, phone, verification_status, last_verified_at, attrs"

type Page = { data: any[] | null; error: unknown }

/**
 * Pide todos los esenciales de la ciudad solo con las columnas de la lista, de 4 páginas en 4 (lib/fetchAll).
 * Si Supabase rechaza alguna columna (una base a la que le falte un SQL antiguo), repite con `*` como antes: la página
 * nunca se queda sin esenciales por haber recortado las columnas.
 */
export async function fetchEssentialsList(
  client: { from: (table: string) => any },
  city: CityKey,
  columns: string = ESSENTIAL_LIST_COLUMNS
): Promise<any[]> {
  const page = (cols: string, onError?: () => void) => (from: number, to: number): PromiseLike<Page> =>
    scopeToCity(client.from("essentials").select(cols), city)
      .order("id")
      .range(from, to)
      .then((r: Page) => {
        if (r.error) onError?.()
        return r
      })
  let failed = false
  const data = await fetchAllPages<any>(page(columns, () => { failed = true }), 1000, 4)
  if (!failed) return data
  return fetchAllPages<any>(page("*"), 1000, 4)
}
