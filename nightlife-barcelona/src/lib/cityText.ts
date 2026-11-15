import type { CityKey } from "./cities"

// Textos que cambian según la ciudad (14/11/2026). La web nació para Barcelona y muchas frases la nombran («Tu noche en
// Barcelona», «el metro de Barcelona cierra pronto…»). Para Madrid cada una de estas claves tiene una hermana con el
// sufijo «_madrid» en los 8 idiomas (p. ej. home.subtitle → home.subtitle_madrid). Barcelona sigue usando la clave de
// siempre, sin tocar.
//
// Para que un texto cambie por ciudad: se añade su clave aquí y su «_madrid» en public/messages/*.json (los 8). Un test
// comprueba que ninguna clave de esta lista se queda sin su versión en algún idioma.
export const CITY_TEXT_KEYS: readonly string[] = [
  // Portada
  "home.hero",
  "home.subtitle",
  "home.about_text",
  "home.liveTonight",
  "home.heroImageAlt",
  "home.statsClubs",
  // Listados y mapa
  "clubs.subtitle",
  "map.title",
  "map.subtitle",
  "nearby.empty",
  "surprise.geoUnsupported",
  "favoritesPage.emptySubtitle",
  // Planifica tu noche
  "planPage.subtitle",
  "planPage.loading2",
  "planPage.funTip3",
  // Esenciales
  "essentials.subtitle",
  "essentials.categories.Pharmacy",
  "essentials.categories.Hospital",
  "essentials.categories.Police",
  "essentialsPage.intro",
  "essentialsPage.farAway",
  "essentialsHelp.homeHint",
  // Páginas de barrio y de estilo, índice de locales y pie
  "areas.titleStyle",
  "areas.genericBarrio",
  "areas.genericStyle",
  "areas.exploreTitle",
  "areas.facts.countStyle",
  "areas.intro.latina",
  "directory.title",
  "footer.tagline",
  "footer.copyright",
  // Cómo llegar y volver (ficha de club): taxi, bus nocturno y metro
  "clubPage.callTaxi",
  "club.night_buses",
  "clubPage.nitbusNearby",
  "clubPage.catalunyaHub",
  "clubPage.metroClosed",
  // Tiempo
  "weather.tonightTitle",
  "weatherTip.nice",
  "weatherTip.nice3",
  "weatherTip.hot3",
  "weatherTip.cold3",
]

/** Clave que se pide a t() para esta ciudad: la «_<ciudad>» si el texto cambia por ciudad, y la de siempre en los demás casos. */
export function cityTextKey(key: string, city: CityKey): string {
  return city !== "barcelona" && CITY_TEXT_KEYS.includes(key) ? `${key}_${city}` : key
}
