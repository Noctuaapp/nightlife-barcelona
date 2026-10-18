// Ayuda compartida por las páginas de evento (/event/[slug] y /club-event/[id]) para que los
// datos estructurados (schema.org Event) que lee Google Search Console sean válidos de verdad.
//
// Dos problemas reales encontrados en octubre 2026:
// 1) "image" se omitía por completo cuando el evento no tenía foto propia — Google exige al
//    menos una imagen para los resultados enriquecidos de evento, así que cualquier evento sin
//    foto quedaba fuera. EVENT_IMAGE_FALLBACK es una foto real y pública (no un data URI, que
//    Google no admite aquí) para que "image" nunca falte.
// 2) "price" se mandaba tal cual escribe el admin en el campo de texto libre ("15€", "Gratis",
//    "10-15€"...) — Google espera solo un número, sin símbolo de moneda (eso va en
//    "priceCurrency" aparte). Un valor como "15€" se marca como campo inválido. parsePriceEUR()
//    extrae un número limpio, trata "gratis"/"free" como 0, y coge el primer número de un rango
//    ("10-15€" → "10"). Si no hay nada aprovechable devuelve null, y entonces es mejor omitir el
//    bloque "offers" entero que mandar uno inválido.
export const EVENT_IMAGE_FALLBACK = "https://www.noctuaapp.com/hero/skyline_barcelona.jpeg"

export function parsePriceEUR(raw: string | null | undefined): string | null {
  if (!raw) return null
  const text = raw.trim().toLowerCase()
  if (!text) return null
  if (/\b(gratis|free|gratuit)\b/.test(text)) return "0"

  const match = text.match(/\d+(?:[.,]\d+)?/)
  if (!match) return null
  return match[0].replace(",", ".")
}
