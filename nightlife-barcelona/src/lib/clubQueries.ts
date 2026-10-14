import { supabase } from "./supabase"

// Las tablas no tienen tipos generados todavía: cada fila es un objeto libre.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>

// Columnas que necesitan de verdad la portada y el listado de clubs. Antes ambas páginas pedían
// select("*") de todos los clubs, incluidas columnas pesadas que solo usa la ficha (galería de
// fotos, reseñas de Google, descripción larga, transporte...), y todo eso viajaba en el HTML de
// cada visita. Si alguna columna de la lista no existiera en la base de datos, la consulta fallaría:
// en ese caso se repite con "*" para que la página nunca salga vacía.
export const HOME_CLUB_FIELDS =
  "id, name, slug, image, neighborhood, city, address, music, category, price, rating, google_rating, trending, verified, hours, open_days, latitude, longitude, lgtbi_friendly"

export const LIST_CLUB_FIELDS =
  "id, name, slug, image, neighborhood, city, address, music, price, hours, open_days, rating, google_rating, people, badges, terrace, vip_tables, smoking_area, table_booking, dresscode, lgtbi_friendly, verified, has_foosball, discount_info, free_entry_info, live_status, live_status_updated_at, latitude, longitude, trending, queue, age_min, audience, venue_type"

export async function fetchVisibleClubs(fields: string): Promise<DbRow[]> {
  const light = await supabase.from("clubs").select(fields).eq("hidden", false)
  if (!light.error) return (light.data || []) as DbRow[]
  console.error("fetchVisibleClubs: columnas no encontradas, se usa select(*)", light.error.message)
  const full = await supabase.from("clubs").select("*").eq("hidden", false)
  return (full.data || []) as DbRow[]
}
