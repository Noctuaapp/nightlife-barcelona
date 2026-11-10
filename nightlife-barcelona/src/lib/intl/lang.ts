// Idiomas de las páginas para quien busca en Google desde fuera (10/11/2026: inglés, alemán, francés e italiano).
//
// Cada idioma tiene su carpeta (src/app/en, src/app/de, src/app/fr, src/app/it) con las mismas páginas y las
// mismas direcciones tras el prefijo (/de/clubs, /fr/clubs...). Cada página de esas carpetas es un archivo
// pequeño que llama a un componente común (components/intl/pages) con su idioma. El español sigue en la raíz
// (/clubs, /nitbus...) y es el idioma por defecto del sitio.
//
// Para añadir otro idioma (neerlandés, portugués...): añadirlo aquí, escribir su diccionario (lib/intl/ui),
// su léxico de locales (lib/intl/clubLex), sus textos de transporte/esenciales y sus guías (lib/intl/guides),
// y crear su carpeta de páginas con scripts/make-intl-pages.mjs. Los tests avisan de lo que falte.

export type IntlLang = "en" | "de" | "fr" | "it"

export const INTL_LANGS: readonly IntlLang[] = ["en", "de", "fr", "it"]

export function isIntlLang(v: unknown): v is IntlLang {
  return typeof v === "string" && (INTL_LANGS as readonly string[]).includes(v)
}

/** Nombre de cada idioma en su propio idioma (selector de idioma). */
export const LANG_LABEL: Record<IntlLang | "es", string> = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
}

/** Cómo se llama la ciudad en cada idioma. */
export const CITY_NAME: Record<IntlLang, string> = { en: "Barcelona", de: "Barcelona", fr: "Barcelone", it: "Barcellona" }

/** «locale» de Open Graph. */
export const OG_LOCALE: Record<IntlLang, string> = { en: "en_GB", de: "de_DE", fr: "fr_FR", it: "it_IT" }

/** Formato de números y fechas en cada idioma. */
export const NUM_LOCALE: Record<IntlLang, string> = { en: "en-GB", de: "de-DE", fr: "fr-FR", it: "it-IT" }
