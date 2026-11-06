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

// Valores únicos de vestimenta (06/11/2026). Antes era texto libre y había 14 variantes ("Elegant", "Smart-casual",
// "Casual arreglado"…), así que el filtro del Plan, que compara el texto exacto, solo ofrecía "Casual". Ahora el
// admin y «Mi club» eligen de esta lista y en la base de datos solo hay estos valores (o vacío).
export const DRESS_CODES = ["Casual", "Smart casual", "Elegante", "Dark casual"] as const

// Texto para mostrar. Solo "Elegante" cambia según el idioma; el resto se escribe igual en todos.
export function dressCodeLabel(code: string, t: (key: string) => string): string {
  return code === "Elegante" ? t("planPage.dressElegant") : code
}
