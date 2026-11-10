import { supabase } from "./supabase"

// ¿Está activo Club Noctua para todo el mundo? (/admin/herramientas → tabla club_noctua_settings, fila 1).
// Se usa en el servidor para decidir si /club-noctua se indexa: en pausa solo enseña una frase («vuelve
// pronto»), y Google lo trata como página vacía («soft 404»). Si la consulta falla, se considera en pausa:
// es mejor no indexarla un rato que indexar una página vacía.
export async function isClubNoctuaOn(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("club_noctua_settings").select("enabled").eq("id", 1).maybeSingle()
    return !error && data?.enabled === true
  } catch {
    return false
  }
}
