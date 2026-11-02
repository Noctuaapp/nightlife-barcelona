// Qué locales de OpenStreetMap importa Noctua y de qué tipo son. Lo usa el importador
// (/api/admin/import-osm-clubs). Está aparte para poder probarlo sin llamar a OpenStreetMap.

// Palabras del nombre que delatan ocio nocturno en un pub o bar (los bares de barrio sin ninguna
// señal se descartan). Cada palabra casa al EMPEZAR una palabra del nombre («disco» vale para
// «Discoteca», pero «Olive» ya no cuenta como «live»); las marcadas `exacta` tienen que ser la
// palabra entera («Rock Bar» sí, «Rocky» no). Sin tildes en clase de caracteres: Overpass trabaja
// por bytes, así que las variantes con tilde van como alternativas completas.
const TOKENS: { rx: string; exacta?: boolean }[] = [
  { rx: "music" }, { rx: "musical" }, { rx: "live", exacta: true }, { rx: "karaoke" }, { rx: "lounge" },
  { rx: "disco" }, { rx: "club" }, { rx: "sala", exacta: true }, { rx: "cocktail" }, { rx: "cocteler" },
  { rx: "coctel" }, { rx: "cóctel" }, { rx: "còctel" }, { rx: "night" }, { rx: "noche" },
  { rx: "nit", exacta: true }, { rx: "nits", exacta: true }, { rx: "dance" }, { rx: "rumba" }, { rx: "salsa" },
  { rx: "latin" }, { rx: "jazz" }, { rx: "rock", exacta: true }, { rx: "blues" }, { rx: "irish" },
  { rx: "chiringuito" }, { rx: "terraza" }, { rx: "rooftop" }, { rx: "billar" }, { rx: "billiard" },
]

const END = "([^a-z]|$)"
const alternatives = TOKENS.map((t) => (t.exacta ? t.rx + END : t.rx)).join("|")

// Esta expresión se aplica aquí, NUNCA dentro de la consulta a Overpass: una expresión regular con
// clases de caracteres obliga a Overpass a recorrer todos los nombres del planeta y la consulta se
// agota (pasó el 1 nov 2026). A Overpass solo se le piden etiquetas simples y el filtro se hace después.
export const NIGHT_NAME = new RegExp(`(^|[^a-z])(${alternatives})`, "i")

// Se descartan siempre restaurantes, granjas, tapas y centros culturales, y las salas VIP y
// negocios de los aeropuertos (el 2/11/2026 se coló «Sala VIP Canudas», una sala de la Terminal 2 del
// Prat que tiene «Sala» en el nombre, y salía en el mapa como un club dentro del aeropuerto).
export const NOT_NIGHTLIFE = /(petanca|bolera|bolos|boccia|deport|futbol|fútbol|tenis|padel|pádel|golf|caza y pesca|jubilad|restaur|granja|freidur|bocata|bocadill|cervecer|tapas|menjador|menjar|comedor|centro cultural|agrupaci|casal|panader|pasteler|helader|kebab|pizzer|hamburguesa|pollo|marisquer|mesón|meson|taberna|sala vip|salon vip|salón vip|vip lounge|business lounge|aeroport|aeropuerto|airport|terminal [12t]([^a-z0-9]|$))/i

export type OsmTags = Record<string, string>

// Los «pub» y «bar» de OpenStreetMap en España son, casi todos, bares de barrio. Solo se admiten
// si hay una señal clara de ocio nocturno: música, baile, karaoke o un nombre tipo club/sala.
export function isNightlifeVenue(tags: OsmTags): boolean {
  const amenity = tags.amenity
  if (amenity === "nightclub" || amenity === "music_venue" || amenity === "karaoke_box") return true
  const name = tags.name || ""
  if (NOT_NIGHTLIFE.test(name)) return false
  if (tags.live_music === "yes" || tags.dance === "yes" || tags.karaoke === "yes") return true
  if (tags.music || Object.keys(tags).some((k) => k.startsWith("music:"))) return true
  return NIGHT_NAME.test(name)
}

// Tipos de local que existen en Noctua (los del desplegable del admin): Discoteca, Pub, Bar musical,
// Coctelería, Karaoke y Bar de billar. De ellos dependen los filtros de Karaoke y Cócteles.
export function venueTypeOf(tags: OsmTags): string {
  const amenity = tags.amenity
  const name = tags.name || ""
  if (amenity === "karaoke_box" || /karaoke/i.test(name)) return "Karaoke"
  if (amenity === "nightclub") return "Discoteca"
  if (amenity === "music_venue") return "Bar musical"
  if (/billar|billiard|(^|[^a-z])pool([^a-z]|$)/i.test(name) || tags.sport === "billiards") return "Bar de billar"
  if (/cocktail|cocteler|c[oóò]ctel/i.test(name)) return "Coctelería"
  return amenity === "pub" ? "Pub" : "Bar musical"
}

// Etiquetas de la ficha que OpenStreetMap dice expresamente. Se devuelven siempre las cinco, en
// true o false: al insertar varios locales de golpe, una columna que falta en uno se rellena con
// null y la base de datos la rechaza.
export function venueFlagsOf(tags: OsmTags, venueType: string) {
  return {
    karaoke: tags.karaoke === "yes" || venueType === "Karaoke",
    live_music: tags.live_music === "yes" || tags.amenity === "music_venue",
    dance_floor: tags.dance === "yes",
    wheelchair_accessible: tags.wheelchair === "yes",
    cocktails: venueType === "Coctelería",
  }
}
