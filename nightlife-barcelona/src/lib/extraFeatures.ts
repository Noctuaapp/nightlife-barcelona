// Etiquetas nuevas de los locales (25/10/2026). Una sola lista para la ficha, el admin, "Mi club",
// los filtros de /clubs y el texto automático de la ficha: si se añade otra, basta con ponerla aquí
// (y su columna en Supabase, ver supabase/30_etiquetas_y_duenos.sql).
export type ExtraFeature = {
  field: string // columna booleana en public.clubs
  labelKey: string // clave de traducción (clubPage.*)
  label: string // español, para el admin
  emoji: string
  icon: string // nombre en components/ui/Icon
  summary: string // cómo se dice dentro de una frase ("Tiene ...")
  filter?: string // si sale como filtro en /clubs, su texto
}

export const EXTRA_FEATURES: ExtraFeature[] = [
  { field: "cigarette_machine", labelKey: "clubPage.fCigMachine", label: "Máquina de tabaco", emoji: "🚬", icon: "vending", summary: "máquina de tabaco" },
  { field: "darts", labelKey: "clubPage.fDarts", label: "Dardos", emoji: "🎯", icon: "target", summary: "dardos", filter: "Dardos" },
  { field: "karaoke", labelKey: "clubPage.fKaraoke", label: "Karaoke", emoji: "🎤", icon: "mic", summary: "karaoke" },
  { field: "live_music", labelKey: "clubPage.fLiveMusic", label: "Música en directo", emoji: "🎸", icon: "guitar", summary: "música en directo", filter: "Música en directo" },
  { field: "dance_floor", labelKey: "clubPage.fDanceFloor", label: "Pista de baile", emoji: "🪩", icon: "disco", summary: "pista de baile", filter: "Pista de baile" },
  { field: "cloakroom", labelKey: "clubPage.fCloakroom", label: "Guardarropa", emoji: "🧥", icon: "hanger", summary: "guardarropa" },
  { field: "food", labelKey: "clubPage.fFood", label: "Comida / cocina", emoji: "🍔", icon: "food", summary: "cocina", filter: "Comida" },
  { field: "shisha", labelKey: "clubPage.fShisha", label: "Shisha", emoji: "💨", icon: "shisha", summary: "shisha", filter: "Shisha" },
  { field: "wheelchair_accessible", labelKey: "clubPage.fAccessible", label: "Accesible en silla de ruedas", emoji: "♿", icon: "wheelchair", summary: "acceso en silla de ruedas", filter: "Accesible" },
]

export const EXTRA_FEATURE_FIELDS = EXTRA_FEATURES.map((f) => f.field)

// Para los formularios del admin y de "Mi club": solo se recogen las columnas que ya existen en la
// fila (si aún no se ha ejecutado el SQL 30, el formulario sigue guardando sin error).
export function extrasFromRow(row: Record<string, unknown> | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!row) return out
  for (const f of EXTRA_FEATURES) if (f.field in row) out[f.field] = !!row[f.field]
  return out
}
