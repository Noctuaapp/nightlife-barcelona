// ¿Está esta reseña de Google en castellano o catalán? (25/10/2026)
//
// Las reseñas de Google guardadas se descargaron en su día en el idioma original de cada
// persona, así que muchas salían en inglés, francés, italiano... Volver a pedirlas traducidas
// cuesta dinero (es la parte más cara de la API de Google), así que en la ficha solo se enseñan
// las que ya están en castellano o catalán, y para el resto hay un enlace a Google Maps.
//
// Detección sencilla por palabras muy frecuentes de cada idioma: no hace falta ninguna librería
// ni ningún servicio externo, y con reseñas de varias frases acierta casi siempre.
const ES_CA = new Set(
  (
    "el la los las de del que y en un una es muy pero con para por lo se no al su sus como más mas está esta este " +
    "son fue hay todo bien buen buena sitio lugar ambiente música musica copas precio gente trato personal genial " +
    "recomiendo volveré volvere camareros local noche " +
    "i amb molt però per els les és una del dels bon bona lloc gent tot recomano tornarem cambrers música preu"
  ).split(" ")
)
const OTHER = new Set(
  (
    "the and is was were very with for this that to of it great good place nice staff we they you but have had not " +
    "are our my at on be would recommend drinks music " +
    "le les est très avec pour une des et pas sont nous il ça c'est " +
    "der die das und ist sehr mit für nicht ein eine wir es war " +
    "il lo è molto con per una non sono che di della locale " +
    "het een en is zeer met voor niet wij de van " +
    "o os é muito com para uma não um"
  ).split(" ")
)
// Palabras que comparten castellano y otros idiomas (de, la, con, una...) no deciden por sí solas.
const SHARED = new Set(["de", "la", "con", "una", "il", "lo", "per", "en", "o", "e", "es", "di", "les", "et", "des", "a"])

export function isSpanishOrCatalan(text: string | null | undefined): boolean {
  if (!text) return false
  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúàèìòùüïñç'·\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return false
  let es = 0
  let other = 0
  for (const w of words) {
    if (SHARED.has(w)) continue
    if (ES_CA.has(w)) es++
    if (OTHER.has(w)) other++
  }
  // Letras que casi solo usan el castellano y el catalán.
  if (/[ñ¿¡]|l·l/.test(text)) es += 2
  if (es === 0 && other === 0) return words.length <= 3 // "Top!", "10/10": no molesta en ningún idioma
  return es > other
}
