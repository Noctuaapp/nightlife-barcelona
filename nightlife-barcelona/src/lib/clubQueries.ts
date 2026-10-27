import { supabase } from "./supabase"

// Las tablas no tienen tipos generados todavía: cada fila es un objeto libre.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>

// Columnas que necesitan de verdad la portada y el listado de clubs. Antes ambas páginas pedían
// select("*") de todos los clubs, incluidas columnas pesadas que solo usa la ficha (galería de
// fotos, reseñas de Google, descripción larga, transporte...), y todo eso viajaba en el HTML de
// cada visita.
export const HOME_CLUB_FIELDS =
  "id, name, slug, image, neighborhood, city, address, music, price, rating, google_rating, trending, verified, hours, open_days, latitude, longitude, lgtbi_friendly"

export const LIST_CLUB_FIELDS =
  "id, name, slug, image, neighborhood, city, address, music, price, hours, open_days, rating, google_rating, people, badges, terrace, vip_tables, smoking_area, table_booking, dresscode, lgtbi_friendly, swinger_friendly, verified, has_foosball, discount_info, free_entry_info, live_status, live_status_updated_at, latitude, longitude, trending, queue, age_min, audience, venue_type, cigarette_machine, darts, karaoke, live_music, dance_floor, cloakroom, food, shisha, wheelchair_accessible, sports_tv, hot_shows, cocktails"

// Columnas de las listas que no existen en la base de datos. Se recuerdan mientras el servidor
// está vivo para no volver a pedirlas en cada visita.
const missingColumns = new Set<string>()

function missingColumnFrom(message: string): string | null {
  // Mensaje de Postgres/PostgREST: 'column clubs.category does not exist'
  const m = message.match(/column\s+(?:\w+\.)?"?(\w+)"?\s+does not exist/i)
  return m ? m[1] : null
}

// Si una columna de la lista no existe (por ejemplo, porque aún no se ha creado en Supabase), se
// quita de la lista y se repite la consulta, sin mostrar ningún error. Solo si aun así falla se
// piden todas las columnas, para que la página nunca salga vacía.
export async function fetchVisibleClubs(fields: string): Promise<DbRow[]> {
  let cols = fields.split(",").map((c) => c.trim()).filter((c) => c && !missingColumns.has(c))

  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await supabase.from("clubs").select(cols.join(", ")).eq("hidden", false)
    if (!res.error) return (res.data || []) as unknown as DbRow[]

    const missing = missingColumnFrom(res.error.message || "")
    if (!missing || !cols.includes(missing)) break
    missingColumns.add(missing)
    cols = cols.filter((c) => c !== missing)
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[clubs] La columna "${missing}" no existe en Supabase; se omite.`)
    }
  }

  const full = await supabase.from("clubs").select("*").eq("hidden", false)
  return (full.data || []) as DbRow[]
}
