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
  { field: "sports_tv", labelKey: "clubPage.fSportsTv", label: "Deportes en TV (partidos)", emoji: "📺", icon: "tv", summary: "pantallas para ver partidos", filter: "Partidos en TV" },
  { field: "hot_shows", labelKey: "clubPage.fHotShows", label: "Ambiente hot (striptease, shows +18)", emoji: "🔥", icon: "flame", summary: "ambiente hot con shows para adultos", filter: "Ambiente hot" },
  { field: "cocktails", labelKey: "clubPage.fCocktails", label: "Cócteles", emoji: "🍸", icon: "cocktail", summary: "carta de cócteles", filter: "Cócteles" },
  { field: "games", labelKey: "clubPage.fGames", label: "Juegos (de mesa o de beber)", emoji: "🎲", icon: "dice", summary: "juegos de mesa o de beber", filter: "Juegos" },
  { field: "live_music", labelKey: "clubPage.fLiveMusic", label: "Música en directo", emoji: "🎸", icon: "guitar", summary: "música en directo", filter: "Música en directo" },
  { field: "dance_floor", labelKey: "clubPage.fDanceFloor", label: "Pista de baile", emoji: "🪩", icon: "disco", summary: "pista de baile", filter: "Pista de baile" },
  { field: "cloakroom", labelKey: "clubPage.fCloakroom", label: "Guardarropa", emoji: "🧥", icon: "hanger", summary: "guardarropa" },
  { field: "food", labelKey: "clubPage.fFood", label: "Comida / cocina", emoji: "🍔", icon: "food", summary: "cocina", filter: "Comida" },
  { field: "shisha", labelKey: "clubPage.fShisha", label: "Shisha", emoji: "💨", icon: "shisha", summary: "shisha", filter: "Shisha" },
  { field: "wheelchair_accessible", labelKey: "clubPage.fAccessible", label: "Accesible en silla de ruedas", emoji: "♿", icon: "wheelchair", summary: "acceso en silla de ruedas", filter: "Accesible" },
  // 30/10/2026: celebraciones. Columnas en supabase/60.
  { field: "birthdays", labelKey: "clubPage.fBirthdays", label: "Cumpleaños", emoji: "🎂", icon: "cake", summary: "celebración de cumpleaños", filter: "Cumpleaños" },
  { field: "private_events", labelKey: "clubPage.fPrivateEvents", label: "Eventos privados", emoji: "🥂", icon: "lock", summary: "eventos privados", filter: "Eventos privados" },
  { field: "venue_rental", labelKey: "clubPage.fVenueRental", label: "Alquiler del local", emoji: "🔑", icon: "key", summary: "alquiler del local", filter: "Alquiler del local" },
]

export const EXTRA_FEATURE_FIELDS = EXTRA_FEATURES.map((f) => f.field)

// «Cerrado temporalmente» (30/10/2026): el local sigue en la web pero sale como cerrado y no se
// recomienda. No es una etiqueta de servicios, así que no está en la lista de arriba; viaja en el
// mismo mapa "extras" de los formularios (solo si la columna existe, ver supabase/56).
export const CLOSED_FIELD = "temporarily_closed"

// Para los formularios del admin y de "Mi club": solo se recogen las columnas que ya existen en la
// fila (si aún no se ha ejecutado el SQL 30, el formulario sigue guardando sin error).
export function extrasFromRow(row: Record<string, unknown> | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!row) return out
  for (const f of EXTRA_FEATURES) if (f.field in row) out[f.field] = !!row[f.field]
  if (CLOSED_FIELD in row) out[CLOSED_FIELD] = !!row[CLOSED_FIELD]
  return out
}
