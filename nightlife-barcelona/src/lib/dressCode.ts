// Vestimenta de un club (06/11/2026). En la tabla clubs la columna se llama dress_code, pero la ficha, el resumen
// y el Plan leían "dresscode", que no existe: la vestimenta nunca salía y los formularios del admin y de
// «Mi club» la cargaban vacía (y al guardar la borraban). La tabla club_sessions sí usa "dresscode".
// Aquí se acepta cualquiera de las dos y se devuelve texto limpio ("" si no hay dato).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dressCodeOf(club: Record<string, any> | null | undefined): string {
  if (!club) return ""
  for (const key of ["dress_code", "dresscode"]) {
    const v = club[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
}
