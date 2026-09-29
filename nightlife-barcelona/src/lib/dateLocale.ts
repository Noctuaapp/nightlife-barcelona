// Convierte el código de idioma de la app (el mismo que usa LanguageContext) al locale de
// Intl/toLocaleDateString correspondiente, para que las fechas se muestren con el formato y
// los nombres de mes/día del idioma activo en vez de quedar siempre en un idioma fijo.
const DATE_LOCALES: Record<string, string> = {
  es: "es-ES",
  en: "en-GB",
  ca: "ca-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  nl: "nl-NL",
}

export function toDateLocale(locale: string): string {
  return DATE_LOCALES[locale] || "es-ES"
}
