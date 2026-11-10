// Horario, precio y música de un local en el idioma de quien mira la web (11/11/2026). En la base de datos están
// escritos en español ("V/S 23:00-06:00", "15€ con copa", "Techno, Comercial"); aquí se pasan al idioma elegido con
// los diccionarios de lib/intl (clubLex.ts y clubLexExtra.ts), sin inventar nada: si un trozo no se entiende, se
// enseña el texto original. En español no se toca nada.

import { capitalize, hoursOf, musicOf, priceOf, type PriceText } from "./intl/clubText"
import { CLUB_LANGS, type ClubLang } from "./intl/clubLexExtra"

/** El idioma de la web (es, en, ca, fr, de, it, nl, pt) como idioma de traducción; null para el español. */
export function clubLangOf(locale: string): ClubLang | null {
  return (CLUB_LANGS as readonly string[]).includes(locale) ? (locale as ClubLang) : null
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

/** "Techno, Comercial" → "Techno, Commercial". Lo que no se reconoce se deja como está escrito. */
export function displayMusic(locale: string, raw: unknown): string {
  const text = str(raw)
  const lang = clubLangOf(locale)
  if (!text || !lang) return text
  const labels = musicOf(lang, text).map(capitalize)
  return labels.length ? labels.join(", ") : text
}

/** "V/S 23:00-06:00" → "Fri, Sat 23:00–06:00". Si no se entiende el formato, se deja el texto original. */
export function displayHours(locale: string, raw: unknown, openDays?: string[] | null): string {
  const text = str(raw)
  const lang = clubLangOf(locale)
  if (!text || !lang) return text
  const slots = hoursOf(lang, text, openDays)
  return slots.length ? slots.join(" · ") : text
}

/**
 * "15€ con copa" → "15€ with a drink". `translated` es false si alguna palabra no está en el diccionario: entonces
 * `text` es el original en español y quien llama puede pedir una traducción del texto libre (lib/translateContent).
 */
export function displayPrice(locale: string, raw: unknown): PriceText {
  const text = str(raw)
  const lang = clubLangOf(locale)
  if (!text || !lang) return { text, translated: true }
  return priceOf(lang, text) ?? { text, translated: true }
}
